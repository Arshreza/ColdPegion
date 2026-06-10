import { getSessionUser } from "@/lib/org";
import { db } from "@/lib/db";
import { Mail, Bot, Users, PlayCircle, Clock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { EmailStatus } from "@prisma/client";

export default async function DashboardHome() {
  const me = await getSessionUser();
  if (!me) return null;

  const orgFilter = me.organizationId
    ? { user: { organizationId: me.organizationId } }
    : { userId: me.id };

  const emailOrgFilter = me.organizationId
    ? { emailAccount: { organizationId: me.organizationId } }
    : { emailAccount: { userId: me.id } };

  const startOfRange14d = new Date();
  startOfRange14d.setDate(startOfRange14d.getDate() - 14);
  startOfRange14d.setUTCHours(0, 0, 0, 0);

  const startOfRange7d = new Date();
  startOfRange7d.setDate(startOfRange7d.getDate() - 7);
  startOfRange7d.setUTCHours(0, 0, 0, 0);

  const SENT_STATUSES: EmailStatus[] = ["SENT", "DELIVERED", "OPENED", "CLICKED", "REPLIED", "BOUNCED"];

  const [
    emailsSentCount,
    activeAgentsCount,
    draftAgentsCount,
    prospectsCount,
    prospectsAddedThisWeek,
    recentEmails,
    activeAgents,
    emailsLast14d,
  ] = await Promise.all([
    db.email.count({
      where: {
        ...emailOrgFilter,
        direction: "SENT",
        status: { in: SENT_STATUSES },
        isWarmup: false,
      },
    }),
    db.agent.count({ where: { ...orgFilter, status: "ACTIVE" } }),
    db.agent.count({ where: { ...orgFilter, status: "DRAFT" } }),
    db.prospect.count({ where: { ...orgFilter } }),
    db.prospect.count({ where: { ...orgFilter, createdAt: { gte: startOfRange7d } } }),
    db.email.findMany({ 
      where: {
        ...emailOrgFilter,
        direction: "SENT",
        status: { in: SENT_STATUSES },
      },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { prospect: true, agent: true }
    }),
    db.agent.findMany({
      where: { ...orgFilter, status: "ACTIVE" },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { emails: true } }
      }
    }),
    db.email.findMany({
      where: {
        ...emailOrgFilter,
        createdAt: { gte: startOfRange14d },
        isWarmup: false,
      },
      select: {
        direction: true,
        status: true,
        createdAt: true,
      }
    })
  ]);

  // Aggregate daily data maps for the last 7 days (index 0 is 6 days ago, index 6 is today)
  const dailyDataMap: Record<string, { date: string; sent: number; replied: number; bounced: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const key = d.toISOString().split("T")[0];
    dailyDataMap[key] = { date: dateStr, sent: 0, replied: 0, bounced: 0 };
  }

  let week1Sent = 0;
  let week2Sent = 0;
  let week1Replied = 0;
  let week2Replied = 0;

  emailsLast14d.forEach((email) => {
    const isWeek1 = email.createdAt >= startOfRange7d;
    const dateKey = email.createdAt.toISOString().split("T")[0];

    if (email.direction === "SENT") {
      if (email.status === "BOUNCED") {
        if (isWeek1 && dailyDataMap[dateKey]) {
          dailyDataMap[dateKey].bounced++;
        }
      }
      if (SENT_STATUSES.includes(email.status)) {
        if (isWeek1) {
          week1Sent++;
          if (dailyDataMap[dateKey]) {
            dailyDataMap[dateKey].sent++;
          }
        } else {
          week2Sent++;
        }
      }
    } else if (email.direction === "RECEIVED" && email.status === "REPLIED") {
      if (isWeek1) {
        week1Replied++;
        if (dailyDataMap[dateKey]) {
          dailyDataMap[dateKey].replied++;
        }
      } else {
        week2Replied++;
      }
    }
  });

  const chartData = Object.values(dailyDataMap);

  function calculateChange(current: number, previous: number) {
    if (previous === 0) return current > 0 ? "↑100% vs last 7d" : "0% vs last 7d";
    const pct = ((current - previous) / previous) * 100;
    const arrow = pct >= 0 ? "↑" : "↓";
    return `${arrow}${Math.abs(pct).toFixed(1)}% vs last 7d`;
  }

  const sentChange = calculateChange(week1Sent, week2Sent);
  const sentChangeType = week1Sent >= week2Sent ? "positive" : "negative";

  const stats = [
    {
      name: "Total Emails Sent",
      value: emailsSentCount.toLocaleString(),
      change: sentChange,
      changeType: sentChangeType,
      icon: Mail,
    },
    {
      name: "Active AI Agents",
      value: activeAgentsCount.toString(),
      change: `${draftAgentsCount} drafts pending`,
      changeType: "neutral",
      icon: Bot,
    },
    {
      name: "Total Prospects",
      value: prospectsCount.toLocaleString(),
      change: prospectsAddedThisWeek > 0 ? `+${prospectsAddedThisWeek.toLocaleString()} new this week` : "0 new this week",
      changeType: prospectsAddedThisWeek > 0 ? "positive" : "neutral",
      icon: Users,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Welcome back, {me.name?.split(" ")[0] || "User"}!
        </h1>
        <div className="flex items-center space-x-2">
          <Button asChild>
             <Link href="/dashboard/agents/create">New Agent</Link>
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((item) => (
          <div
            key={item.name}
            className="relative overflow-hidden rounded-xl bg-background border border-border p-6 shadow-sm flex items-center justify-between"
          >
            <div>
              <p className="text-sm font-medium text-foreground-muted">
                {item.name}
              </p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                {item.value}
              </p>
              <p className={`text-xs mt-1 ${
                item.changeType === "positive" ? "text-success-600 dark:text-success-400" :
                item.changeType === "negative" ? "text-error-600 dark:text-error-400" :
                "text-foreground-muted"
              }`}>{item.change}</p>
            </div>
            <div className="h-12 w-12 bg-brand-50 rounded-full flex items-center justify-center dark:bg-brand-500/10">
              <item.icon className="h-6 w-6 text-brand-600 dark:text-brand-400" />
            </div>
          </div>
        ))}
      </div>

      {/* Analytics Chart */}
      <DashboardCharts data={chartData} />

      {/* Main Dashboard Area */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mt-8">
        <div className="rounded-xl border border-border bg-background shadow-sm hover:border-brand-200 transition-colors">
          <div className="border-b border-border p-6 flex justify-between items-center">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-500" /> Recent Activity
            </h2>
            <Link href="/dashboard/inbox" className="text-xs text-brand-600 hover:underline">View Inbox</Link>
          </div>
          <div className="p-0">
            {recentEmails.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-foreground-muted mb-4">
                  No activity yet. Set up your first AI agent to start sending campaigns.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentEmails.map(email => (
                  <div key={email.id} className="p-4 hover:bg-background-tertiary transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-medium text-sm text-foreground truncate pr-4">Sent to {email.prospect?.email ?? 'Unknown'}</p>
                      <span className="text-xs text-foreground-muted whitespace-nowrap">
                        {email.createdAt.toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-foreground-muted truncate">Subject: {email.subject}</p>
                    <p className="text-xs text-brand-600 mt-1">Via {email.agent?.name ?? 'Unknown'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-background shadow-sm hover:border-brand-200 transition-colors">
          <div className="border-b border-border p-6 flex justify-between items-center">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
               <PlayCircle className="w-4 h-4 text-success-500" /> Active Agents
            </h2>
            <Link href="/dashboard/agents" className="text-xs text-brand-600 hover:underline">Manage All</Link>
          </div>
          <div className="p-0">
            {activeAgents.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-foreground-muted mb-4">
                  You don't have any active agents right now.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {activeAgents.map(agent => (
                  <div key={agent.id} className="p-4 hover:bg-background-tertiary transition-colors flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm text-foreground">{agent.name}</p>
                      <p className="text-xs text-foreground-muted mt-1 truncate max-w-[200px]">{agent.description}</p>
                    </div>
                    <div className="text-right">
                       <span className="inline-flex items-center gap-1.5 rounded-full bg-success-500/10 px-2 py-0.5 text-[10px] font-medium text-success-600 uppercase tracking-wider mb-1">
                          Running
                       </span>
                       <p className="text-xs text-foreground-muted block">{agent._count.emails} total sends</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
