import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Lightbulb, MessageSquare, Sparkles } from "lucide-react";
import { guides, getGuide, GUIDE_CATEGORIES } from "@/lib/docs/guides";
import { JsonLd } from "@/components/marketing/json-ld";
import { SITE_URL } from "@/lib/site";

export function generateStaticParams() {
  return guides.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return {};
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `/docs/${guide.slug}` },
  };
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const index = guides.findIndex((g) => g.slug === guide.slug);
  const prev = guides[index - 1];
  const next = guides[index + 1];

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: guide.title,
    description: guide.description,
    url: `${SITE_URL}/docs/${guide.slug}`,
    publisher: { "@type": "Organization", name: "ColdPigeon", url: SITE_URL },
  };

  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[240px_1fr] lg:px-8 lg:py-16">
      <JsonLd data={articleJsonLd} />

      {/* SIDEBAR NAV */}
      <aside className="hidden lg:block">
        <nav className="sticky top-24 space-y-6">
          <Link
            href="/docs"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground-secondary hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All guides
          </Link>
          {GUIDE_CATEGORIES.map((category) => {
            const items = guides.filter((g) => g.category === category);
            if (items.length === 0) return null;
            return (
              <div key={category}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                  {category}
                </h3>
                <ul className="mt-2 space-y-1">
                  {items.map((g) => (
                    <li key={g.slug}>
                      <Link
                        href={`/docs/${g.slug}`}
                        className={
                          g.slug === guide.slug
                            ? "block rounded-md bg-brand-500/10 px-2.5 py-1.5 text-sm font-medium text-brand-600 dark:text-brand-400"
                            : "block rounded-md px-2.5 py-1.5 text-sm text-foreground-secondary hover:bg-background-tertiary hover:text-foreground"
                        }
                      >
                        {g.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>
      </aside>

      {/* ARTICLE */}
      <article className="min-w-0 max-w-3xl animate-fade-in">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
          {guide.category}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          {guide.title}
        </h1>
        <p className="mt-3 text-lg text-foreground-secondary">{guide.description}</p>

        <div className="mt-10 space-y-10">
          {guide.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-xl font-bold tracking-tight text-foreground">{s.heading}</h2>
              {s.body?.map((p) => (
                <p key={p.slice(0, 40)} className="mt-3 leading-relaxed text-foreground-secondary">
                  {p}
                </p>
              ))}
              {s.steps && (
                <ol className="mt-4 space-y-3">
                  {s.steps.map((step, i) => (
                    <li key={step.slice(0, 40)} className="flex gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full gradient-brand text-xs font-bold text-white">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed text-foreground-secondary">{step}</span>
                    </li>
                  ))}
                </ol>
              )}
              {s.bullets && (
                <ul className="mt-4 list-disc space-y-2 pl-5 marker:text-brand-500">
                  {s.bullets.map((b) => (
                    <li key={b.slice(0, 40)} className="leading-relaxed text-foreground-secondary">
                      {b}
                    </li>
                  ))}
                </ul>
              )}
              {s.code && (
                <div className="mt-4">
                  {s.code.label && (
                    <p className="mb-1.5 font-mono text-xs text-foreground-muted">{s.code.label}</p>
                  )}
                  <pre className="overflow-x-auto rounded-xl border border-border bg-sidebar-bg p-4 font-mono text-xs leading-relaxed text-sidebar-fg">
                    {s.code.text}
                  </pre>
                </div>
              )}
              {s.tip && (
                <div className="mt-4 flex gap-3 rounded-xl border border-brand-500/30 bg-brand-500/5 p-4">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                  <p className="text-sm leading-relaxed text-foreground-secondary">{s.tip}</p>
                </div>
              )}
            </section>
          ))}
        </div>

        {/* STILL STUCK */}
        <div className="mt-14 rounded-2xl border-gradient p-6">
          <h2 className="font-semibold text-foreground">Still stuck? Ask an AI that can actually fix it.</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <p className="flex items-start gap-2.5 text-sm leading-relaxed text-foreground-secondary">
              <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
              Open the <strong className="text-foreground">Sidekick</strong> in your dashboard — it has
              these guides built in and can inspect and fix your account directly.
            </p>
            <p className="flex items-start gap-2.5 text-sm leading-relaxed text-foreground-secondary">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent-500" />
              Or ask <strong className="text-foreground">Claude</strong> with the{" "}
              <Link href="/claude" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
                MCP connector
              </Link>{" "}
              — same guides, same tools, from any Claude app.
            </p>
          </div>
        </div>

        {/* PREV / NEXT */}
        <nav className="mt-10 flex items-center justify-between gap-4 border-t border-border pt-6">
          {prev ? (
            <Link
              href={`/docs/${prev.slug}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground-secondary hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link
              href={`/docs/${next.slug}`}
              className="inline-flex items-center gap-1.5 text-right text-sm font-medium text-foreground-secondary hover:text-foreground"
            >
              {next.title} <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </nav>
      </article>
    </div>
  );
}
