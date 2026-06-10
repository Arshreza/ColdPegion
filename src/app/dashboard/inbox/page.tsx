"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, Bot, Inbox as InboxIcon, Send, Archive, Search, MoreVertical, Flame, RefreshCw, ArrowDownLeft, ArrowUpRight } from "lucide-react";

export default function UnifiedInboxPage() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [sending, setSending] = useState(false);
  const [emails, setEmails] = useState<any[]>([]);
  const [activeEmail, setActiveEmail] = useState<any | null>(null);
  const [replyText, setReplyText] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  async function fetchInbox() {
    try {
      const res = await fetch("/api/inbox");
      if (res.ok) {
        const data = await res.json();
        setEmails(data);
        setActiveEmail((prev: any) => (prev ? data.find((e: any) => e.id === prev.id) || data[0] : data[0]) || null);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInbox();
  }, []);

  async function handleSync() {
    setSyncing(true);
    setNotice(null);
    try {
      const res = await fetch("/api/inbox/sync", { method: "POST" });
      const data = await res.json();
      setNotice(res.ok ? data.message : data.error || "Sync failed");
      if (res.ok) await fetchInbox();
    } catch (e) {
      setNotice("Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function handleSendReply() {
    if (!activeEmail || !replyText.trim()) return;
    setSending(true);
    setNotice(null);
    try {
      const res = await fetch("/api/inbox/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId: activeEmail.id, body: replyText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      setReplyText("");
      setNotice("Reply sent. Sequence paused for this prospect.");
      await fetchInbox();
    } catch (e: any) {
      setNotice(e.message);
    } finally {
      setSending(false);
    }
  }

  const getCategoryColor = (cat: string) => {
     switch (cat) {
        case "INTERESTED": return "bg-success-500/10 text-success-600 border-success-200";
        case "QUESTION": return "bg-brand-500/10 text-brand-600 border-brand-200";
        case "NOT_INTERESTED": return "bg-error-500/10 text-error-600 border-error-200";
        case "UNSUBSCRIBE": return "bg-error-500/10 text-error-600 border-error-200";
        case "OUT_OF_OFFICE": return "bg-warning-500/10 text-warning-600 border-warning-200";
        case "AUTO_REPLY": return "bg-border text-foreground-secondary border-border";
        default: return "bg-border text-foreground-secondary border-border";
     }
  };

  const prettyCat = (cat?: string) => (cat ? cat.replace(/_/g, " ") : null);

  if (loading) {
     return (
        <div className="flex h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      );
  }

  return (
    <div className="h-[calc(100vh-8rem)] min-h-[600px] bg-background border border-border rounded-xl shadow-sm flex overflow-hidden animate-fade-in">
      
      {/* Left Pane - List of threads */}
      <div className="w-1/3 min-w-[300px] max-w-[400px] border-r border-border flex flex-col bg-background-tertiary">
         <div className="p-4 border-b border-border bg-background">
            <div className="flex items-center justify-between">
               <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <InboxIcon className="h-5 w-5 text-brand-500" />
                  Unified Inbox
               </h1>
               <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing} className="h-8">
                  {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  <span className="ml-1.5 hidden sm:inline">Sync</span>
               </Button>
            </div>
            {notice && <p className="text-xs text-foreground-muted mt-2">{notice}</p>}
            <div className="relative mt-4">
               <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-foreground-muted" />
               <Input placeholder="Search emails, prospects..." className="pl-9 h-9" />
            </div>
         </div>
         
         <div className="flex-1 overflow-y-auto">
            {emails.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <Mail className="h-10 w-10 text-foreground-muted/50 mb-3" />
                  <p className="text-foreground-muted font-medium">Inbox zero!</p>
                  <p className="text-xs text-foreground-muted/70 mt-1">No emails or replies found across your agents.</p>
               </div>
            ) : (
               emails.map(email => (
                 <button
                   key={email.id}
                   onClick={() => setActiveEmail(email)}
                   className={`w-full text-left p-4 border-b border-border transition-colors hover:bg-background ${activeEmail?.id === email.id ? "bg-background border-l-4 border-l-brand-500" : ""}`}
                 >
                   <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-sm truncate pr-2">{email.prospect.name || email.prospect.email}</span>
                      <span className="text-xs text-foreground-muted whitespace-nowrap">
                        {new Date(email.date).toLocaleDateString()}
                      </span>
                   </div>
                   <div className="text-xs text-foreground-muted mb-2 truncate flex items-center gap-1">
                      {email.direction === "RECEIVED" ? (
                         <><ArrowDownLeft className="h-3 w-3 text-success-600" /> {email.counterpartyEmail} &rarr; {email.senderAccount}</>
                      ) : (
                         <><ArrowUpRight className="h-3 w-3 text-brand-500" /> {email.senderAccount}{email.agentName ? ` (via ${email.agentName})` : ""}</>
                      )}
                   </div>
                   <p className="text-sm font-medium text-foreground truncate mb-2">{email.subject}</p>

                   <div className="flex justify-between items-center mt-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase font-medium tracking-wide ${getCategoryColor(email.category || (email.direction === "RECEIVED" ? "NEUTRAL" : email.status))}`}>
                         {prettyCat(email.category) || (email.direction === "RECEIVED" ? "Received" : email.status)}
                      </span>
                      {email.category === "INTERESTED" && <Flame className="h-3 w-3 text-error-500" />}
                   </div>
                 </button>
               ))
            )}
         </div>
      </div>

      {/* Right Pane - Thread view */}
      <div className="flex-1 flex flex-col bg-background relative">
         {!activeEmail ? (
            <div className="hidden md:flex flex-col items-center justify-center h-full text-center p-12 bg-background-tertiary/20">
               <Bot className="h-16 w-16 text-foreground-muted/30 mb-4" />
               <h3 className="text-lg font-medium text-foreground">Select a conversation</h3>
               <p className="text-sm text-foreground-muted mt-2 max-w-md">
                 Connect multiple email accounts and deploy agents to see unified threads appear here automatically. AI categorizes incoming replies routing 'Interested' leads directly to you.
               </p>
            </div>
         ) : (
            <>
               <div className="p-4 border-b border-border bg-background flex justify-between items-center shadow-sm z-10">
                  <div>
                     <h2 className="font-semibold text-lg">{activeEmail.subject}</h2>
                     <p className="text-sm text-foreground-muted flex items-center gap-2 mt-1">
                        <span className="bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded text-xs border border-brand-200 dark:bg-brand-500/10 dark:text-brand-400">Agent: {activeEmail.agentName}</span>
                        <span>{activeEmail.senderAccount} &rarr; {activeEmail.prospect.email}</span>
                     </p>
                  </div>
                  <div className="flex items-center gap-2">
                     <Button variant="outline" size="sm" className="hidden sm:flex hover:bg-warning-50 hover:text-warning-600 hover:border-warning-200">
                        <Archive className="mr-2 w-4 h-4" /> Pause Agent
                     </Button>
                     <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4 text-foreground-muted" />
                     </Button>
                  </div>
               </div>
               
               <div className="flex-1 overflow-y-auto p-6 bg-background-tertiary">
                  <div className="bg-background border border-border rounded-xl p-5 shadow-sm max-w-3xl mx-auto mb-6 relative">
                     <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-lg">
                              {(activeEmail.prospect.name?.[0] || activeEmail.prospect.email?.[0] || "U").toUpperCase()}
                           </div>
                           <div>
                              <p className="font-semibold text-sm">{activeEmail.prospect.name || "Prospect"}</p>
                              <p className="text-xs text-foreground-muted">{activeEmail.prospect.company || activeEmail.prospect.email}</p>
                           </div>
                        </div>
                        <span className="text-xs text-foreground-muted">{new Date(activeEmail.date).toLocaleDateString()} at {new Date(activeEmail.date).toLocaleTimeString()}</span>
                     </div>
                     <div className="text-sm text-foreground space-y-4 whitespace-pre-wrap leading-relaxed">
                        {activeEmail.body}
                     </div>
                  </div>
                  
                  {activeEmail.status === "SENT" && (
                     <div className="text-center text-xs text-foreground-muted my-6 flex items-center justify-center gap-2">
                        <span className="h-px bg-border flex-1 max-w-[100px]"></span>
                        Waiting for prospect reply
                        <span className="h-px bg-border flex-1 max-w-[100px]"></span>
                     </div>
                  )}
               </div>

               <div className="p-4 border-t border-border bg-background">
                  <div className="relative max-w-3xl mx-auto">
                     <textarea 
                        className="w-full min-h-[100px] p-4 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm resize-none"
                        placeholder="Write your reply... (The agent sequence has been paused for this prospect automatically)"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                     />
                     <div className="absolute bottom-4 right-4 flex gap-2">
                        <Button className="h-8" onClick={handleSendReply} disabled={sending || !replyText.trim()}>
                           {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />} Send
                        </Button>
                     </div>
                  </div>
               </div>
            </>
         )}
      </div>

    </div>
  );
}
