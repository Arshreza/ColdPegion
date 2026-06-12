import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { ScrollProgress } from "@/components/marketing/scroll-progress";
import { EasterEgg } from "@/components/marketing/easter-egg";
import { JsonLd } from "@/components/marketing/json-ld";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ColdPegion — Your AI Sales Team, On Autopilot",
    template: "%s · ColdPegion",
  },
  description:
    "Autonomous AI email agents that find leads, write hyper-personalized outreach, and book replies. MCP-native: run your entire outbound from Claude on auto mode.",
  keywords: [
    "AI cold email",
    "cold outreach automation",
    "AI sales agents",
    "AI SDR",
    "MCP connector",
    "Claude connector",
    "Claude routines",
    "Apollo integration",
    "email warmup",
    "cold email deliverability",
    "Instantly alternative",
    "Smartlead alternative",
    "Lemlist alternative",
  ],
  applicationName: SITE_NAME,
  category: "technology",
  robots: { index: true, follow: true },
  openGraph: {
    title: "ColdPegion — Your AI Sales Team, On Autopilot",
    description:
      "Autonomous AI email agents that find leads, write hyper-personalized outreach, and book replies. MCP-native: run your entire outbound from Claude on auto mode.",
    type: "website",
    siteName: SITE_NAME,
    url: SITE_URL,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "ColdPegion — Your AI Sales Team, On Autopilot",
    description:
      "The only cold outreach platform that runs inside Claude. Apollo + any connector, auto mode with Claude routines.",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/opengraph-image`,
  description:
    "AI-first cold outreach platform with autonomous email agents and a native Claude MCP connector.",
};

const webSiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
};

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col">
      <JsonLd data={organizationJsonLd} />
      <JsonLd data={webSiteJsonLd} />
      <ScrollProgress />
      <Navbar isAuthed={!!session?.user} />
      <main className="flex-1">{children}</main>
      <Footer />
      <EasterEgg />
    </div>
  );
}
