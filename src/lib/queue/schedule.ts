import type { Agent } from "@prisma/client";

// Hard cap on the random per-email delay (minutes), per product spec.
export const MAX_RANDOM_DELAY_MINUTES = 10;

/**
 * Compute staggered send timestamps for a batch of emails so that a campaign
 * is paced out over time (the "enterprise long-running" behaviour) instead of
 * blasting everything at once.
 *
 * Pacing rules come from the agent:
 *  - minIntervalMinutes / maxIntervalMinutes: base gap between consecutive emails
 *  - randomDelayMax: extra random jitter (minutes) added on top
 *  - scheduleDays / scheduleStartHour / scheduleEndHour: only send inside the
 *    configured sending window; outside it we roll forward to the next window.
 *
 * Times are computed in UTC. (Per-timezone scheduling is a future enhancement.)
 */
export function computeSendTimes(agent: Agent, count: number, from: Date = new Date()): Date[] {
  const times: Date[] = [];
  const allowedDays = parseScheduleDays(agent.scheduleDays);
  const startHour = clampHour(agent.scheduleStartHour);
  const endHour = clampHour(agent.scheduleEndHour);

  let cursor = new Date(from.getTime());
  cursor = moveIntoWindow(cursor, allowedDays, startHour, endHour);

  for (let i = 0; i < count; i++) {
    times.push(new Date(cursor.getTime()));

    // Gap before the next email: a base interval plus a capped random delay.
    const min = Math.max(0, agent.minIntervalMinutes);
    const max = Math.max(min, agent.maxIntervalMinutes);
    const baseGap = min + Math.random() * (max - min);
    const cappedDelayMax = Math.min(Math.max(0, agent.randomDelayMax), MAX_RANDOM_DELAY_MINUTES);
    const jitter = Math.random() * cappedDelayMax;
    const gapMs = (baseGap + jitter) * 60_000;

    cursor = new Date(cursor.getTime() + gapMs);
    cursor = moveIntoWindow(cursor, allowedDays, startHour, endHour);
  }

  return times;
}

function parseScheduleDays(raw: string): Set<number> {
  // Stored as e.g. "1,2,3,4,5" (Mon-Fri). JS getUTCDay: 0=Sun..6=Sat.
  const days = (raw || "1,2,3,4,5")
    .split(",")
    .map((d) => parseInt(d.trim(), 10))
    .filter((d) => !Number.isNaN(d) && d >= 0 && d <= 6);
  return new Set(days.length ? days : [1, 2, 3, 4, 5]);
}

function clampHour(h: number): number {
  if (Number.isNaN(h)) return 0;
  return Math.min(23, Math.max(0, h));
}

/**
 * Advance a timestamp forward until it lands inside an allowed day and within
 * [startHour, endHour). If a window has no hours (start >= end) we treat it as
 * all-day to avoid an infinite loop.
 */
function moveIntoWindow(date: Date, days: Set<number>, startHour: number, endHour: number): Date {
  const allDay = startHour >= endHour;
  const d = new Date(date.getTime());

  for (let guard = 0; guard < 14; guard++) {
    const day = d.getUTCDay();
    const hour = d.getUTCHours();

    if (!days.has(day)) {
      // Jump to start of next day.
      d.setUTCDate(d.getUTCDate() + 1);
      d.setUTCHours(allDay ? 0 : startHour, 0, 0, 0);
      continue;
    }

    if (!allDay && hour < startHour) {
      d.setUTCHours(startHour, 0, 0, 0);
      continue;
    }

    if (!allDay && hour >= endHour) {
      d.setUTCDate(d.getUTCDate() + 1);
      d.setUTCHours(startHour, 0, 0, 0);
      continue;
    }

    return d;
  }
  return d;
}

/** Wall-clock hour + weekday in a given IANA timezone (falls back to UTC). */
function localHourDay(now: Date, timezone?: string | null): { hour: number; day: number } {
  if (!timezone) return { hour: now.getUTCHours(), day: now.getUTCDay() };
  try {
    const local = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
    if (Number.isNaN(local.getTime())) return { hour: now.getUTCHours(), day: now.getUTCDay() };
    return { hour: local.getHours(), day: local.getDay() };
  } catch {
    return { hour: now.getUTCHours(), day: now.getUTCDay() };
  }
}

/**
 * True if `now` falls inside the agent's sending window. When a prospect
 * timezone is given, the window is evaluated in the prospect's LOCAL time so
 * each lead is contacted during their own working hours.
 */
export function isWithinSchedule(agent: Agent, now: Date = new Date(), timezone?: string | null): boolean {
  const days = parseScheduleDays(agent.scheduleDays);
  const startHour = clampHour(agent.scheduleStartHour);
  const endHour = clampHour(agent.scheduleEndHour);
  const { hour, day } = localHourDay(now, timezone);
  if (!days.has(day)) return false;
  if (startHour >= endHour) return true; // all-day
  return hour >= startHour && hour < endHour;
}
