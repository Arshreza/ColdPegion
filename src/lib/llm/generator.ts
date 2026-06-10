import { OpenAI } from "openai";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { parseSequenceSteps, pickVariant } from "@/lib/sequence";

interface GenerationContext {
  userId: string;
  agentId: string;
  prospectId: string;
  sequenceStep?: number;
  senderName?: string;
}

/** Summarise a product's ideal-customer-profile (prompt or structured filter). */
function describeIcp(product: { icpMode?: string | null; icpPrompt?: string | null; icpFilters?: string | null }): string {
  if (product.icpMode === "FILTER" && product.icpFilters) {
    try {
      const f = JSON.parse(product.icpFilters);
      const parts: string[] = [];
      if (f.jobTitles?.length) parts.push(`titles: ${f.jobTitles.join(", ")}`);
      if (f.seniorities?.length) parts.push(`seniority: ${f.seniorities.join(", ")}`);
      if (f.departments?.length) parts.push(`departments: ${f.departments.join(", ")}`);
      if (f.industries?.length) parts.push(`industries: ${f.industries.join(", ")}`);
      if (f.locations?.length) parts.push(`locations: ${f.locations.join(", ")}`);
      if (f.headcount?.length) parts.push(`company size: ${f.headcount.join(", ")}`);
      if (f.keywords?.length) parts.push(`keywords: ${f.keywords.join(", ")}`);
      return parts.join("; ");
    } catch {
      return "";
    }
  }
  return product.icpPrompt || "";
}

/** Render a static template with {{firstName}} style variables. */
function renderStaticTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key) => vars[key] ?? "");
}

export async function generatePersonalizedEmail({ userId, agentId, prospectId, sequenceStep = 0, senderName }: GenerationContext) {
  const agent = await db.agent.findUnique({
    where: { id: agentId },
    include: {
      products: { include: { product: true } }
    }
  });

  const prospect = await db.prospect.findUnique({ where: { id: prospectId } });
  const companyProfile = await db.companyProfile.findUnique({ where: { userId } });

  if (!agent || !prospect) {
    throw new Error("Agent or Prospect not found.");
  }

  const vars: Record<string, string> = {
    firstName: prospect.firstName || "there",
    lastName: prospect.lastName || "",
    companyName: prospect.companyName || "your company",
    jobTitle: prospect.jobTitle || "",
    email: prospect.email,
    senderName: senderName || "",
  };

  // STATIC mode: substitute variables into the user-defined template, no LLM call.
  if (agent.sequenceMode === "STATIC") {
    const steps = parseSequenceSteps(agent);
    const step = steps[Math.min(sequenceStep, steps.length - 1)];
    if (step?.body || step?.variants?.length) {
      const chosen = pickVariant(step);
      if (chosen.body) {
        const subject = renderStaticTemplate(chosen.subject || `Quick note for ${vars.firstName}`, vars);
        const body = renderStaticTemplate(chosen.body, vars);
        return { subject, body, variant: chosen.label };
      }
    }
    // No body defined for this step — fall through to AI generation.
  }

  // 1. LLM configuration (AI_GENERATED / HYBRID modes).
  const llmConfig = await db.llmConfig.findUnique({ where: { userId } });
  if (!llmConfig || !llmConfig.apiKey) {
    throw new Error("No valid LLM Configuration found. Please configure API Keys in settings.");
  }

  const apiKey = decrypt(llmConfig.apiKey);

  const openai = new OpenAI({
    baseURL: llmConfig.apiBaseUrl || "https://api.openai.com/v1",
    apiKey: apiKey,
  });

  // 2. Build the System Prompt
  const productsDescriptions = agent.products.map(p => {
    const name = p.product.name;
    const desc = p.product.description || "this offering";
    const ta = p.product.targetAudience || "relevant buyers";
    const usps = p.product.usps || "n/a";
    const icp = describeIcp(p.product);

    let docNotes = "";
    try {
      const files: Array<{ url: string; filename: string; description: string }> =
        (p.product as any).productFiles ? JSON.parse((p.product as any).productFiles) : [];
      docNotes = files
        .filter(f => f.description)
        .map(f => `\n  Document (${f.filename}): ${f.description}`)
        .join("");
      const hasPdf = files.some(f => f.filename.toLowerCase().endsWith(".pdf"));
      if (hasPdf && !docNotes) docNotes = "\n  A product document PDF is attached to this email.";
    } catch { }

    return `- ${name}: ${desc} (Target: ${ta}) [USPs: ${usps}]${icp ? `\n  Ideal customer: ${icp}` : ""}${docNotes}`;
  }).join("\n") || "- (No product details provided — keep the pitch generic and benefit-led.)";

  const systemPrompt = `You are an expert sales development representative writing a highly personalized cold email.

COMPANY CONTEXT:
Our Company: ${companyProfile?.companyName || "Our Company"}
Industry: ${companyProfile?.industry || "B2B"}
Value Proposition: ${companyProfile?.valuePropositions || "We help teams get measurable results."}
Tone of Voice: ${companyProfile?.toneOfVoice || "Professional, confident, and concise."}
Sender Name (sign off using this name): ${senderName || "the sender"}

PRODUCTS TO SELL:
${productsDescriptions}

AGENT SPECIFIC GUIDELINES:
${agent.guidelines || "No specific guidelines provided. Follow general best practices."}

OUTPUT FORMAT — respond with EXACTLY this, nothing else:
SUBJECT: <a specific, lowercase-ish, non-clickbait subject, 3-7 words>
BODY: <the email body>

WRITING RULES:
1. Plain text only — no markdown, no HTML, no bullet symbols, no signature block.
2. Under 120 words. Short sentences. Sound like a real person, not a template.
3. Personalize using the prospect's role/company; do NOT invent facts about them you weren't given.
4. Lead with relevance/value, not "I hope this finds you well" or other clichés.
5. One clear, low-friction call to action (a question or a small ask).
6. Avoid spam-trigger words (free, guarantee, act now, limited time, $$$) and excessive punctuation/ALL CAPS.
7. Sign off the email using the sender's name: "${senderName || "Our Team"}". Do NOT include placeholder tags like [Your Name], [Company], or unresolved {{variables}} — write the finished message.`;

  // 3. Build the User Prompt
  const stepInstruction = sequenceStep > 0
    ? `This is FOLLOW-UP #${sequenceStep} in the sequence. Keep it short, reference the earlier outreach lightly, and add a fresh angle. Do not repeat the first email.`
    : `This is the FIRST touch in the sequence.`;

  const userPrompt = `PROSPECT CONTEXT:
Name: ${prospect.firstName || ""} ${prospect.lastName || ""}
Job Title: ${prospect.jobTitle || "Professional"}
Company: ${prospect.companyName || "their company"}
Industry: ${prospect.industry || "N/A"}
Location: ${prospect.location || "N/A"}
LinkedIn: ${prospect.linkedinUrl || "N/A"}

${stepInstruction}

Write the email to this prospect now.`;

  // 4. Execute the LLM Call
  console.log(`[LLM] Calling ${llmConfig.apiBaseUrl} with model ${llmConfig.modelName}`);
  
  try {
    const completion = await openai.chat.completions.create({
      model: llmConfig.modelName || "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 400,
    });

    const responseText = completion.choices[0].message.content || "";
    console.log(`[LLM] Response received (${responseText.length} chars)`);

    // 5. Parse Subject and Body (tolerant of formatting variations).
    const subjectMatch = responseText.match(/SUBJECT:\s*(.+)/i);
    const bodyMatch = responseText.split(/BODY:\s*/i);

    const cleanSubject = (s: string) =>
      s.trim().replace(/^["'“”]+|["'“”]+$/g, "").replace(/\s+/g, " ").trim();

    const parsedSubject = subjectMatch
      ? cleanSubject(subjectMatch[1])
      : `Quick question for ${prospect.companyName || prospect.firstName || "you"}`;
    let parsedBody = bodyMatch.length > 1 ? bodyMatch[1].trim() : responseText.trim();
    // Defensive: strip a leaked "SUBJECT: ..." line if the split didn't catch it.
    parsedBody = parsedBody.replace(/^SUBJECT:.*(\n|$)/i, "").trim();

    if (senderName) {
      // Replace [Your Name] and variations if LLM hallucinates/leaks them
      parsedBody = parsedBody.replace(/\[Your Name\]/gi, senderName);
      parsedBody = parsedBody.replace(/Your Name/gi, senderName);
      parsedBody = parsedBody.replace(/\[Name\]/gi, senderName);
    }

    return {
      subject: parsedSubject,
      body: parsedBody,
      variant: undefined as string | undefined,
    };
  } catch (error: any) {
    console.error(`[LLM] Error:`, error.message);
    if (error.response) {
      console.error(`[LLM] Status: ${error.response.status}`);
      console.error(`[LLM] Body:`, JSON.stringify(error.response.body || error.response.data));
    }
    throw error;
  }
}
