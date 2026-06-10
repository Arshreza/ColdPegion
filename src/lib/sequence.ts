export interface SequenceVariant {
  subject?: string;
  body?: string;
}

export interface SequenceStep {
  waitDays: number;
  subject?: string;
  body?: string;
  variants?: SequenceVariant[]; // optional A/B variants for this step
}

/**
 * Pick a send variant for a step. If A/B variants are defined, choose one at
 * random; otherwise use the step's own subject/body. Returns the content plus a
 * label ("A", "B", …) for tracking.
 */
export function pickVariant(step: SequenceStep): { subject?: string; body?: string; label: string } {
  const variants = (step.variants || []).filter((v) => v && (v.subject || v.body));
  if (variants.length > 0) {
    const all = [{ subject: step.subject, body: step.body }, ...variants];
    const idx = Math.floor(Math.random() * all.length);
    return { subject: all[idx].subject, body: all[idx].body, label: String.fromCharCode(65 + idx) };
  }
  return { subject: step.subject, body: step.body, label: "A" };
}

const DEFAULT_STEPS: SequenceStep[] = [{ waitDays: 0 }];

/**
 * Parse an agent's sequence definition into a normalized step array.
 * Accepts the new `sequenceSteps` JSON, falls back to legacy `staticSequence`,
 * and always returns at least one step (the first touch).
 */
export function parseSequenceSteps(agent: { sequenceSteps?: string | null; staticSequence?: string | null }): SequenceStep[] {
  const raw = agent.sequenceSteps || agent.staticSequence;
  if (!raw) return DEFAULT_STEPS;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length) {
      return parsed.map((s: any, i: number) => ({
        waitDays: i === 0 ? 0 : Math.max(0, Number(s?.waitDays) || 0),
        subject: typeof s?.subject === "string" ? s.subject : undefined,
        body: typeof s?.body === "string" ? s.body : undefined,
        variants: Array.isArray(s?.variants)
          ? s.variants
              .filter((v: any) => v && (typeof v.subject === "string" || typeof v.body === "string"))
              .map((v: any) => ({ subject: v.subject, body: v.body }))
          : undefined,
      }));
    }
    // A single static template object/string -> one step.
    if (parsed && typeof parsed === "object") {
      return [{ waitDays: 0, subject: parsed.subject, body: parsed.body }];
    }
  } catch {
    // legacy plain-text static body
    return [{ waitDays: 0, body: raw }];
  }
  return DEFAULT_STEPS;
}
