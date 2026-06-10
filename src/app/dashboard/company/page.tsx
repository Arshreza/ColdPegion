"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Building2, Save, Sparkles } from "lucide-react";

export default function CompanyProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [profile, setProfile] = useState({
    companyName: "",
    website: "",
    industry: "",
    description: "",
    valuePropositions: "",
    toneOfVoice: "Professional, confident, and concise",
    targetMarkets: "",
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/company");
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setProfile({
              companyName: data.companyName || "",
              website: data.website || "",
              industry: data.industry || "",
              description: data.description || "",
              valuePropositions: data.valuePropositions || "",
              toneOfVoice: data.toneOfVoice || "Professional, confident, and concise",
              targetMarkets: data.targetMarkets || "",
            });
          }
        }
      } catch (error) {
        console.error("Failed to load profile", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  async function handleAutoGenerate() {
    if (!profile.website) {
      setMessage({ text: "Enter a website URL above first", type: "error" });
      return;
    }
    setGenerating(true);
    setMessage(null);
    try {
      const res = await fetch("/api/company/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: profile.website }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Extraction failed");
      }
      const data = await res.json();
      setProfile((prev) => ({
        ...prev,
        companyName: data.companyName || prev.companyName,
        industry: data.industry || prev.industry,
        description: data.description || prev.description,
        valuePropositions: data.valuePropositions || prev.valuePropositions,
      }));
      setMessage({ text: "Auto-generated company details from website!", type: "success" });
    } catch (error: any) {
      setMessage({ text: error.message || "Failed to extract company info", type: "error" });
    } finally {
      setGenerating(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      if (!res.ok) throw new Error("Failed to save profile");

      setMessage({ text: "Company profile saved successfully", type: "success" });
    } catch (error) {
      setMessage({ text: "Failed to save company profile", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Company Profile
          </h1>
          <p className="text-foreground-muted mt-1 text-sm">
            AI agents use these details to understand your business and draft personalized emails.
          </p>
        </div>
        <Button 
          variant="outline" 
          className="bg-brand-50/50 text-brand-700 border-brand-200 hover:bg-brand-100 hover:text-brand-800 dark:bg-brand-500/10 dark:text-brand-400 dark:border-brand-500/20"
          onClick={handleAutoGenerate}
          disabled={generating || !profile.website}
        >
          {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {generating ? "Extracting..." : "Auto-Generate from Website"}
        </Button>
      </div>

      {message && (
        <div className={`p-4 rounded-md ${message.type === "success" ? "bg-success-500/10 text-success-600" : "bg-error-500/10 text-error-600"}`}>
          {message.text}
        </div>
      )}

      <div className="rounded-xl border border-border bg-background shadow-sm" id="onboarding-company-card">
        <div className="border-b border-border p-6 flex items-center gap-3">
          <div className="p-2 bg-brand-500/10 rounded-lg">
            <Building2 className="h-5 w-5 text-brand-600 dark:text-brand-400" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Core Details</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                value={profile.companyName}
                onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                placeholder="Acme Corp"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website URL</Label>
              <Input
                id="website"
                type="url"
                value={profile.website}
                onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                placeholder="https://acme.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="industry">Industry</Label>
            <Input
              id="industry"
              value={profile.industry}
              onChange={(e) => setProfile({ ...profile, industry: e.target.value })}
              placeholder="e.g. B2B SaaS, Finance, Healthcare"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">About the Company</Label>
            <textarea
              id="description"
              className="flex min-h-[100px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-foreground-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={profile.description}
              onChange={(e) => setProfile({ ...profile, description: e.target.value })}
              placeholder="We provide AI-powered marketing solutions for..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="valuePropositions">Key Value Propositions</Label>
            <textarea
              id="valuePropositions"
              className="flex min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-foreground-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={profile.valuePropositions}
              onChange={(e) => setProfile({ ...profile, valuePropositions: e.target.value })}
              placeholder="1. Save 10 hours a week. 2. Increase reply rates by 40%..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="targetMarkets">Target Markets (ICP)</Label>
              <Input
                id="targetMarkets"
                value={profile.targetMarkets}
                onChange={(e) => setProfile({ ...profile, targetMarkets: e.target.value })}
                placeholder="VP of Sales, Marketing Directors at Series A startups"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="toneOfVoice">Email Tone of Voice</Label>
              <Input
                id="toneOfVoice"
                value={profile.toneOfVoice}
                onChange={(e) => setProfile({ ...profile, toneOfVoice: e.target.value })}
                placeholder="Friendly but professional, concise"
              />
            </div>
          </div>

          <div className="flex justify-end border-t border-border pt-6">
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Profile
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
