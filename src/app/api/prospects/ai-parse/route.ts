import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { z } from "zod";

const bodySchema = z.object({ query: z.string().min(1).max(500) });

function resolveModel(baseUrl: string, apiKey: string, modelName: string) {
  if (baseUrl.includes("googleapis.com") || baseUrl.includes("generativelanguage")) {
    return createGoogleGenerativeAI({ apiKey })(modelName);
  }
  return createOpenAI({ baseURL: baseUrl, apiKey }).chat(modelName);
}

const SYSTEM = `You extract lead search filters from a natural language query.
Return ONLY valid JSON with these exact keys (all arrays of strings, all optional):
{
  "jobTitles": [],
  "seniorities": [],
  "departments": [],
  "industries": [],
  "locations": [],
  "headcount": [],
  "keywords": [],
  "technologies": []
}

Rules:
- jobTitles: specific titles like "HR Manager", "Campus Recruiter", "CTO"
- seniorities: ONLY from: C-Level, VP, Director, Manager, Senior, Entry, Owner, Partner, Founder
- departments: ONLY from: Engineering, Sales, Marketing, Finance, Operations, HR, Product, IT, Legal, Executive
- industries: plain English like "Information Technology", "Healthcare", "Finance"
- locations: city, country or region like "India", "Bangalore", "United States"
- headcount: ONLY from: 1-10, 11-50, 51-200, 201-500, 501-1000, 1001-5000, 5001-10000, 10000+
- keywords: company names, buzzwords, anything that doesn't fit above
- technologies: tech stack like "Salesforce", "AWS", "React"
- Keep arrays empty [] if nothing relevant found
- Do NOT explain — output JSON only`;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { query } = bodySchema.parse(await req.json());

    const llmConfig = await db.llmConfig.findUnique({ where: { userId: session.user.id } });
    if (!llmConfig?.apiKey) {
      return NextResponse.json({ error: "Configure your AI API key in Settings first." }, { status: 400 });
    }

    const model = resolveModel(
      llmConfig.apiBaseUrl || "https://api.openai.com/v1",
      decrypt(llmConfig.apiKey),
      llmConfig.modelName || "gpt-4o-mini",
    );

    const { text } = await generateText({
      model,
      system: SYSTEM,
      prompt: query,
      maxOutputTokens: 400,
    });

    // Extract JSON — the model might wrap it in ```json fences
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "Could not parse AI response." }, { status: 500 });

    const filters = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ filters });
  } catch (e: any) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    console.error("AI parse error:", e);
    return NextResponse.json({ error: e.message || "AI parse failed" }, { status: 500 });
  }
}
