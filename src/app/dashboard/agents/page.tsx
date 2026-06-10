"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Bot, Settings, Play, Copy } from "lucide-react";

export default function AgentsPage() {
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<any[]>([]);
  const [cloning, setCloning] = useState<string | null>(null);

  async function fetchAgents() {
    try {
      const res = await fetch("/api/agents");
      if (res.ok) setAgents(await res.json());
    } catch (error) {
      console.error("Failed to fetch agents", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAgents();
  }, []);

  async function cloneAgent(id: string) {
    setCloning(id);
    try {
      const res = await fetch(`/api/agents/${id}/clone`, { method: "POST" });
      if (res.ok) await fetchAgents();
    } finally {
      setCloning(null);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            AI Agents
          </h1>
          <p className="text-foreground-muted mt-1 text-sm">
            Create autonomous agents orchestrating cold email campaigns.
          </p>
        </div>
        <Button asChild id="onboarding-launch-agent">
          <Link href="/dashboard/agents/create">
            <Plus className="mr-2 h-4 w-4" /> Create Agent
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex h-[300px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      ) : agents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-background/50 p-12 text-center mt-4">
          <Bot className="mx-auto h-12 w-12 text-foreground-muted/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground">No active agents.</h3>
          <p className="mt-1 text-sm text-foreground-muted mb-6">
            Build your first AI Agent to start parsing lists and sending automated emails.
          </p>
          <Button asChild>
            <Link href="/dashboard/agents/create">
              <Plus className="mr-2 h-4 w-4" /> Create your first Agent
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
          {agents.map((agent) => (
            <div key={agent.id} className="rounded-xl border border-border bg-background shadow-sm hover:border-brand-200 transition-colors flex flex-col group">
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-brand-50 rounded-xl flex items-center justify-center border border-brand-100 dark:bg-brand-500/10 dark:border-brand-500/20">
                      <Bot className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-lg">{agent.name}</h3>
                      <p className="text-xs text-foreground-muted">Created: {new Date(agent.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium ${
                    agent.status === "ACTIVE" ? "bg-success-500/10 text-success-600" :
                    agent.status === "PAUSED" ? "bg-warning-500/10 text-warning-600" :
                    agent.status === "DRAFT" ? "bg-border text-foreground-secondary" :
                    "bg-error-500/10 text-error-600"
                  }`}>
                    {agent.status}
                  </span>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-foreground-muted line-clamp-2 min-h-[40px]">
                    {agent.description || "No description provided."}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="bg-background-tertiary rounded-lg p-3">
                      <p className="text-xs text-foreground-muted uppercase tracking-wider mb-1">Products</p>
                      <p className="text-sm font-medium">{agent.products?.length || 0} attached</p>
                    </div>
                    <div className="bg-background-tertiary rounded-lg p-3">
                      <p className="text-xs text-foreground-muted uppercase tracking-wider mb-1">Prospects</p>
                      <p className="text-sm font-medium">Mapped to {agent.prospectLists?.length || 0} lists</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-background-tertiary px-5 py-3 border-t border-border flex items-center gap-2">
                <Button variant="outline" size="sm" asChild className="h-9 flex-1 text-brand-700 bg-brand-50 border-brand-200 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400 dark:border-brand-500/20">
                  <Link href={`/dashboard/agents/${agent.id}`}>
                    <Play className="mr-2 h-4 w-4" /> Open Dashboard
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild className="h-9 w-9 p-0" title="Manage Config">
                  <Link href={`/dashboard/agents/${agent.id}`}>
                    <Settings className="h-4 w-4 text-foreground-secondary" />
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0" title="Clone agent" onClick={() => cloneAgent(agent.id)} disabled={cloning === agent.id}>
                  {cloning === agent.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4 text-foreground-secondary" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
