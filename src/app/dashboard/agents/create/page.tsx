"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight, Bot, Target, Settings, CheckCircle2 } from "lucide-react";

export default function CreateAgentPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reference lookups
  const [lists, setLists] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    targetListId: "",
    senderAccountIds: [] as string[],
    productMode: "SINGLE" as const,
    productIds: [] as string[],
    sequenceMode: "AI_GENERATED" as const,
    guidelines: "Keep it friendly and professional. Mention our value proposition clearly.",
    includeUnsubscribe: true,
  });

  useEffect(() => {
    async function loadResources() {
      try {
        const [lRes, aRes, pRes] = await Promise.all([
          fetch("/api/prospect-lists"),
          fetch("/api/email-accounts"),
          fetch("/api/products")
        ]);
        if (lRes.ok) setLists(await lRes.json());
        if (aRes.ok) setAccounts(await aRes.json());
        if (pRes.ok) setProducts(await pRes.json());
      } catch (e) {
        console.error(e);
      }
    }
    loadResources();
  }, []);

  async function handleCreate() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create agent");
      }
      
      router.push("/dashboard/agents");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
    }
  }

  const isStep1Valid = formData.name.length > 0 && formData.description.length > 0;
  const isStep2Valid = formData.targetListId !== "" && formData.senderAccountIds.length > 0;

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Create AI Agent
        </h1>
        <p className="text-foreground-muted mt-1 text-sm">
          Set up a new autonomous worker to handle outbound emails.
        </p>
      </div>

      {/* Progress Tracker */}
      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border -z-10 -translate-y-1/2 rounded" />
        
        <div className={`flex flex-col items-center gap-2 ${step >= 1 ? "text-brand-600" : "text-foreground-muted"}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium shadow-sm transition-colors ${step >= 1 ? "bg-brand-500 text-white" : "bg-background border border-border"}`}>
             {step > 1 ? <CheckCircle2 className="w-5 h-5" /> : "1"}
          </div>
          <span className="text-xs font-semibold">General Setup</span>
        </div>

        <div className={`flex flex-col items-center gap-2 ${step >= 2 ? "text-brand-600" : "text-foreground-muted"}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium shadow-sm transition-colors ${step >= 2 ? "bg-brand-500 text-white" : "bg-background border border-border"}`}>
            {step > 2 ? <CheckCircle2 className="w-5 h-5" /> : "2"}
          </div>
          <span className="text-xs font-semibold">Mappings</span>
        </div>

        <div className={`flex flex-col items-center gap-2 ${step >= 3 ? "text-brand-600" : "text-foreground-muted"}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium shadow-sm transition-colors ${step >= 3 ? "bg-brand-500 text-white" : "bg-background border border-border"}`}>
            3
          </div>
          <span className="text-xs font-semibold">Guidelines</span>
        </div>
      </div>

      {error && (
         <div className="p-4 mb-6 rounded-md bg-error-500/10 text-error-600 text-sm">
            {error}
         </div>
      )}

      <div className="bg-background border border-border rounded-xl shadow-sm p-6 sm:p-8">
        
        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-6 animate-slide-up">
            <div className="flex items-center gap-3 border-b border-border pb-4 mb-6">
              <Bot className="h-5 w-5 text-brand-500" />
              <h2 className="text-lg font-semibold">Agent Definition</h2>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">Agent Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Product Launch Bot - Q2"
                required
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Internal Purpose Description</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="flex min-h-[100px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-foreground-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Marketing our new compliance features to healthcare executives."
                required
              />
            </div>
            <div className="pt-4 flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!isStep1Valid}>
                Next Step <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-6 animate-slide-up">
             <div className="flex items-center gap-3 border-b border-border pb-4 mb-6">
              <Target className="h-5 w-5 text-brand-500" />
              <h2 className="text-lg font-semibold">Target & Infrastructure Mappings</h2>
            </div>

            <div className="space-y-2">
              <Label>Select Target Prospect List</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto p-1">
                {lists.length === 0 ? <p className="text-sm text-foreground-muted italic">No lists created.</p> : lists.map(list => (
                  <div 
                    key={list.id} 
                    onClick={() => setFormData({ ...formData, targetListId: list.id })}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${formData.targetListId === list.id ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-border hover:border-brand-300'}`}
                  >
                    <p className="font-medium text-sm">{list.name}</p>
                    <p className="text-xs text-foreground-muted">{list._count.prospects} Prospects</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-4">
              <Label>Select Sender Email Accounts</Label>
              <p className="text-xs text-foreground-muted">Pick multiple mailboxes to load-balance sending across them for better deliverability.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto p-1">
                {accounts.length === 0 ? <p className="text-sm text-foreground-muted italic">No accounts configured.</p> : accounts.map(acc => {
                  const selected = formData.senderAccountIds.includes(acc.id);
                  return (
                  <div
                    key={acc.id}
                    onClick={() => setFormData({
                      ...formData,
                      senderAccountIds: selected
                        ? formData.senderAccountIds.filter((id) => id !== acc.id)
                        : [...formData.senderAccountIds, acc.id],
                    })}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${selected ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-border hover:border-brand-300'}`}
                  >
                    <p className="font-medium text-sm truncate">{acc.emailAddress}</p>
                    <p className="text-xs text-foreground-muted uppercase tracking-wider">{acc.provider}</p>
                  </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 pt-4">
              <Label>Assign Products Context</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto p-1">
                {products.length === 0 ? <p className="text-sm text-foreground-muted italic">No products available.</p> : products.map(prod => (
                  <div 
                    key={prod.id} 
                    onClick={() => {
                      const selected = formData.productIds.includes(prod.id);
                      setFormData({ 
                        ...formData, 
                        productIds: selected 
                          ? formData.productIds.filter(id => id !== prod.id) 
                          : [...formData.productIds, prod.id] 
                      });
                    }}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${formData.productIds.includes(prod.id) ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-border hover:border-brand-300'}`}
                  >
                    <p className="font-medium text-sm truncate">{prod.name}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>Go Back</Button>
              <Button onClick={() => setStep(3)} disabled={!isStep2Valid}>
                Next Step <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="space-y-6 animate-slide-up">
            <div className="flex items-center gap-3 border-b border-border pb-4 mb-6">
              <Settings className="h-5 w-5 text-brand-500" />
              <h2 className="text-lg font-semibold">AI Operating Guidelines</h2>
            </div>
            
            <div className="space-y-2">
              <Label>Sequence Engine Mode</Label>
               <select 
                title="Sequence Mode"
                className="flex h-12 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={formData.sequenceMode}
                onChange={(e) => setFormData({ ...formData, sequenceMode: e.target.value as any })}
              >
                <option value="AI_GENERATED">Full Autopilot (AI generates dynamic personalized sequences)</option>
                <option value="STATIC">Template Only (No AI rewrites)</option>
              </select>
            </div>

            <div className="flex flex-col space-y-1.5 pt-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="includeUnsubscribe"
                  checked={formData.includeUnsubscribe}
                  onChange={(e) => setFormData({ ...formData, includeUnsubscribe: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <Label htmlFor="includeUnsubscribe" className="text-sm font-medium leading-none cursor-pointer">
                  Include "Unsubscribe" buttons &amp; headers
                </Label>
              </div>
              <p className="text-xs text-foreground-muted pl-6">
                Highly recommended for marketing/sales campaigns. Turn off only for 1:1 outreach like job applications and resumes, as bulk sending without unsubscribe headers violates provider rules.
              </p>
            </div>

            <div className="space-y-2 pt-4">
              <Label htmlFor="guidelines">Custom AI Prompt Rules</Label>
              <textarea
                id="guidelines"
                value={formData.guidelines}
                onChange={(e) => setFormData({ ...formData, guidelines: e.target.value })}
                className="flex min-h-[150px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-foreground-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Give the AI explicit rules for this campaign. (e.g. Do not use emojis. Keep it under 100 words.)"
              />
              <p className="text-xs text-foreground-muted">These rules supplement your global company tone-of-voice settings.</p>
            </div>

            <div className="pt-6 flex justify-between border-t border-border mt-8">
              <Button variant="outline" onClick={() => setStep(2)}>Go Back</Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Assemble Agent
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
