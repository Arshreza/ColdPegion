import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { safeFetch, SsrfError } from "@/lib/security/ssrf";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = await enforceRateLimit(request, "product-extract", 20, 60_000);
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
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ColdPigeonBot/1.0)", Accept: "text/html" },
        signal: AbortSignal.timeout(10000),
      });
    } catch (e) {
      if (e instanceof SsrfError) return NextResponse.json({ error: e.message }, { status: 400 });
      throw e;
    }

    if (!res.ok) {
      return NextResponse.json({ error: "Could not fetch the URL" }, { status: 400 });
    }

    const html = await res.text();

    // Extract meta tags and content from HTML
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
    const description = getMetaContent("description") || "";

    // Extract visible text from body for USPs/audience (strip tags)
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    let bodyText = "";
    if (bodyMatch?.[1]) {
      bodyText = bodyMatch[1]
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 2000); // Limit to first 2000 chars
    }

    // Extract h1, h2 headings for USPs
    const headings: string[] = [];
    const headingRegex = /<h[12][^>]*>([^<]+)<\/h[12]>/gi;
    let headingMatch;
    while ((headingMatch = headingRegex.exec(html)) !== null) {
      const text = headingMatch[1].trim();
      if (text.length > 3 && text.length < 200) {
        headings.push(text);
      }
    }

    // Build the extracted product data
    const name = getMetaContent("site_name") || title.split(/[|\-–—]/)[0]?.trim() || title;
    const usps = headings.slice(0, 5).join(". ") || "";
    const targetAudience = ""; // Can't reliably extract this from HTML alone

    return NextResponse.json({
      name: name.slice(0, 100),
      description: description.slice(0, 500),
      usps: usps.slice(0, 500),
      targetAudience,
      sourceUrl: url,
    });
  } catch (error: any) {
    console.error("Product extraction error:", error);
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      return NextResponse.json({ error: "URL took too long to respond" }, { status: 408 });
    }
    return NextResponse.json({ error: "Failed to extract product info" }, { status: 500 });
  }
}
