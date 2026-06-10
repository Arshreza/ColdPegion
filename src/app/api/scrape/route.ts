import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { safeFetch, SsrfError } from "@/lib/security/ssrf";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = await enforceRateLimit(request, "scrape", 20, 60_000);
  if (limited) return limited;

  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // SSRF-guarded fetch (blocks internal/metadata hosts, validates redirects).
    let response: Response;
    try {
      response = await safeFetch(url, { signal: AbortSignal.timeout(10000) });
    } catch (e) {
      if (e instanceof SsrfError) return NextResponse.json({ error: e.message }, { status: 400 });
      throw e;
    }

    const html = await response.text();

    // Regex extraction for <title> and <meta name="description">
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i) || 
                      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["'][^>]*>/i);

    const title = titleMatch ? titleMatch[1].trim() : "";
    const description = descMatch ? descMatch[1].trim() : "";

    return NextResponse.json({
      title,
      description,
      rawHtmlPreview: html.substring(0, 1000), // First 1000 chars for LLM to process if needed
    });
  } catch (error) {
    console.error("Scraping error:", error);
    return NextResponse.json({ error: "Failed to scrape the URL" }, { status: 500 });
  }
}
