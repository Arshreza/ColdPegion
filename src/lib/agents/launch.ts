import { db } from "@/lib/db";
import { scheduleEmailJob } from "@/lib/queue/worker";
import { computeSendTimes } from "@/lib/queue/schedule";
import { buildBalancedAssignments } from "@/lib/queue/balancer";

function sameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

export class LaunchError extends Error {}

/**
 * Launch an agent's campaign: seed the background queue with staggered,
 * schedule-aware, org-load-balanced send jobs and mark the agent ACTIVE.
 * Non-blocking — returns immediately after enqueueing. Shared by the launch API
 * route and the AI Sidekick.
 */
export async function launchAgentCampaign(agentId: string, userId: string): Promise<{ queued: number; message: string }> {
  const agent = await db.agent.findUnique({
    where: { id: agentId, userId },
    include: { prospectLists: true, emailAccounts: true },
  });
  if (!agent) throw new LaunchError("Agent not found.");
  if (agent.emailAccounts.length === 0) throw new LaunchError("Agent has no sender email account configured.");
  if (agent.prospectLists.length === 0) throw new LaunchError("Agent has no target prospect lists.");

  const listIds = agent.prospectLists.map((pl) => pl.prospectListId);
  const accountIds = agent.emailAccounts.map((ea) => ea.emailAccountId);
  const accounts = await db.emailAccount.findMany({
    where: { id: { in: accountIds }, isActive: true, status: { not: "DISCONNECTED" } },
  });
  if (accounts.length === 0) throw new LaunchError("No active sender mailbox available for this agent.");

  const today = new Date();
  if (!sameUtcDay(agent.lastResetDate, today)) {
    await db.agent.update({ where: { id: agentId }, data: { sentToday: 0, lastResetDate: today } });
  }

  const prospects = await db.prospect.findMany({
    where: {
      userId,
      isDnc: false,
      listEntries: { some: { prospectListId: { in: listIds } } },
      emails: { none: { agentId } },
    },
    select: { id: true },
    take: 1000,
  });

  await db.agent.update({ where: { id: agentId }, data: { status: "ACTIVE", launchedAt: today } });

  if (prospects.length === 0) {
    return { queued: 0, message: "Agent is active. No new prospects to enqueue right now." };
  }

  let sequence = await db.sequence.findFirst({ where: { agentId } });
  if (!sequence) {
    sequence = await db.sequence.create({
      data: {
        agentId,
        name: `${agent.name} — primary sequence`,
        steps: agent.sequenceSteps || agent.staticSequence || JSON.stringify([{ waitDays: 0 }]),
      },
    });
  }

  const sendTimes = computeSendTimes(agent, prospects.length, today);
  const assignments = await buildBalancedAssignments(accounts, prospects.length);
  let queued = 0;

  for (let i = 0; i < prospects.length; i++) {
    const prospect = prospects[i];
    await db.sequenceEnrollment.upsert({
      where: { sequenceId_prospectId: { sequenceId: sequence.id, prospectId: prospect.id } },
      update: { status: "ACTIVE", nextSendAt: sendTimes[i] },
      create: { sequenceId: sequence.id, prospectId: prospect.id, status: "ACTIVE", nextSendAt: sendTimes[i] },
    });
    const senderAccountId = assignments[i];
    const delayMs = Math.max(0, sendTimes[i].getTime() - Date.now());
    await scheduleEmailJob({ agentId, prospectId: prospect.id, userId, emailAccountId: senderAccountId }, delayMs);
    queued++;
  }

  return { queued, message: `Launched. ${queued} emails are sending in the background on your schedule.` };
}

/** Pause an agent — already-queued jobs become no-ops (worker checks status). */
export async function pauseAgentCampaign(agentId: string, userId: string): Promise<{ message: string }> {
  const agent = await db.agent.findUnique({ where: { id: agentId, userId } });
  if (!agent) throw new LaunchError("Agent not found.");
  await db.agent.update({ where: { id: agentId }, data: { status: "PAUSED" } });
  return { message: "Agent paused. No further emails will be sent." };
}
