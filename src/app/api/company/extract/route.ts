import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { safeFetch, SsrfError } from "@/lib/security/ssrf";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = await enforceRateLimit(request, "company-extract", 20, 60_000);
  if (limited) return limited;

  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // SSRF-guarded fetch (blocks internal/metadata hosts, validates redirects).
    let res: Response;
    try {
      res = await safeFetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ColdPegionBot/1.0)", Accept: "text/html" },
        signal: AbortSignal.timeout(10000),
      });
    } catch (e) {
      if (e instanceof SsrfError) return NextResponse.json({ error: e.message }, { status: 400 });
      throw e;
    }

    if (!res.ok) {
      return NextResponse.json({ error: "Could not fetch the website" }, { status: 400 });
    }

    const html = await res.text();

    // Helper to extract meta tag content
    const getMetaContent = (name: string): string => {
      const patterns = [
        new RegExp(`<meta[^>]+(?:name|property)=["'](?:og:)?${name}["'][^>]+content=["']([^"']+)["']`, "i"),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["'](?:og:)?${name}["']`, "i"),
      ];
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match?.[1]) return match[1].trim();
      }
      return "";
    };

    // Get page title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch?.[1]?.trim() || "";

    // Get meta description
    const metaDescription = getMetaContent("description") || "";

    // Extract headings for value propositions
    const headings: string[] = [];
    const headingRegex = /<h[123][^>]*>([\s\S]*?)<\/h[123]>/gi;
    let headingMatch;
    while ((headingMatch = headingRegex.exec(html)) !== null) {
      const text = headingMatch[1].replace(/<[^>]+>/g, "").trim();
      if (text.length > 5 && text.length < 200) {
        headings.push(text);
      }
    }

    // Try to identify industry from keywords
    const bodyText = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .toLowerCase();

    const industryKeywords: Record<string, string[]> = {
      "SaaS / Software": ["saas", "software", "platform", "cloud", "app"],
      "E-Commerce": ["shop", "store", "ecommerce", "e-commerce", "buy now"],
      "FinTech / Finance": ["fintech", "banking", "finance", "payments", "investment"],
      "Healthcare": ["health", "medical", "clinic", "patient", "healthcare"],
      "Marketing / AdTech": ["marketing", "advertising", "seo", "campaign", "leads"],
      "Education / EdTech": ["education", "learning", "course", "training", "teach"],
      "Real Estate": ["real estate", "property", "listings", "homes"],
      "Consulting": ["consulting", "advisory", "strategy", "services"],
    };

    let detectedIndustry = "";
    let maxScore = 0;
    for (const [industry, keywords] of Object.entries(industryKeywords)) {
      const score = keywords.filter((kw) => bodyText.includes(kw)).length;
      if (score > maxScore) {
        maxScore = score;
        detectedIndustry = industry;
      }
    }

    // Build company name from og:site_name or title
    const companyName = getMetaContent("site_name") || title.split(/[|\-–—]/)[0]?.trim() || "";

    return NextResponse.json({
      companyName: companyName.slice(0, 100),
      description: metaDescription.slice(0, 500),
      industry: detectedIndustry,
      valuePropositions: headings.slice(0, 5).join(". ").slice(0, 500),
    });
  } catch (error: any) {
    console.error("Company extraction error:", error);
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      return NextResponse.json({ error: "Website took too long to respond" }, { status: 408 });
    }
    return NextResponse.json({ error: "Failed to extract company info" }, { status: 500 });
  }
}
