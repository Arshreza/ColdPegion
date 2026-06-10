"use client"

import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Button } from '@/components/ui/button'
import { Sparkles, Minimize2, Send, Loader2, Bot, Check, AlertTriangle, Wrench, PlusCircle } from 'lucide-react'

const transport = new DefaultChatTransport({ api: '/api/sidekick' })

// Friendly labels for the agent's tools.
const TOOL_LABELS: Record<string, string> = {
  get_overview: 'Reading account overview',
  get_deliverability: 'Checking deliverability',
  list_products: 'Listing products',
  list_prospect_lists: 'Listing prospect lists',
  list_email_accounts: 'Listing mailboxes',
  list_agents: 'Listing agents',
  get_inbox_replies: 'Reading inbox replies',
  create_product: 'Creating product',
  update_product: 'Updating product',
  delete_product: 'Deleting product',
  create_prospect_list: 'Creating list',
  add_prospect: 'Adding prospect',
  find_leads: 'Searching for leads',
  create_agent: 'Building agent',
  launch_agent: 'Launching campaign',
  pause_agent: 'Pausing agent',
  configure_agent: 'Configuring agent',
  author_campaign_content: 'Writing campaign content',
  set_do_not_contact: 'Updating DNC list',
  clone_agent: 'Cloning agent',
  sync_inbox: 'Syncing inbox',
  get_company_profile: 'Reading company profile',
  update_company_profile: 'Updating company profile',
  update_daily_limit: 'Updating daily limit',
  invite_teammate: 'Inviting teammate',
  list_team: 'Reading team',
  approve_join_request: 'Updating join request',
  set_member_role: 'Updating member role',
  start_welcome_tour: 'Launching welcome tour',
}

function pageLabelFromPath(path: string | null): string | undefined {
  if (!path) return undefined
  const map: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/dashboard/inbox': 'Unified Inbox',
    '/dashboard/agents': 'AI Agents',
    '/dashboard/prospects': 'Prospects',
    '/dashboard/prospects/finder': 'Find Leads',
    '/dashboard/products': 'Products',
    '/dashboard/accounts': 'Email Accounts',
    '/dashboard/deliverability': 'Deliverability',
    '/dashboard/team': 'Team',
    '/dashboard/company': 'Company Profile',
    '/dashboard/settings': 'Settings',
  }
  return map[path] || (path.startsWith('/dashboard/agents/') ? 'Agent detail' : undefined)
}

const SUGGESTIONS = [
  'Give me an overview of my account',
  'Find 25 VPs of Sales at SaaS companies and add them to a "Q3 SaaS" list',
  'Which mailbox has the best deliverability?',
  'Create an agent for my top product and launch it',
]

export function Sidekick() {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [convoId, setConvoId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const hydratedRef = useRef(false)
  const triggeredToursRef = useRef<Set<string>>(new Set())
  const pathname = usePathname()

  const { messages, sendMessage, status, error, setMessages } = useChat({ transport })
  const isLoading = status === 'submitted' || status === 'streaming'

  // Restore (or create) a persistent conversation id.
  useEffect(() => {
    let id = localStorage.getItem('mp_sidekick_convo')
    if (!id) {
      id = (crypto.randomUUID && crypto.randomUUID()) || `c_${Date.now()}_${Math.random().toString(36).slice(2)}`
      localStorage.setItem('mp_sidekick_convo', id)
    }
    setConvoId(id)
  }, [])

  // Hydrate prior messages once when the panel first opens.
  useEffect(() => {
    if (!isOpen || !convoId || hydratedRef.current || messages.length > 0) return
    hydratedRef.current = true
    fetch(`/api/sidekick/conversations/${convoId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.messages?.length) setMessages(d.messages)
      })
      .catch(() => {})
  }, [isOpen, convoId, messages.length, setMessages])

  function startNewChat() {
    const id = (crypto.randomUUID && crypto.randomUUID()) || `c_${Date.now()}_${Math.random().toString(36).slice(2)}`
    localStorage.setItem('mp_sidekick_convo', id)
    setConvoId(id)
    setMessages([])
    triggeredToursRef.current.clear()
  }

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setIsOpen(open => !open)
      }
    }
    const open = () => setIsOpen(true)
    document.addEventListener('keydown', down)
    window.addEventListener('mp:open-sidekick', open)
    return () => {
      document.removeEventListener('keydown', down)
      window.removeEventListener('mp:open-sidekick', open)
    }
  }, [])

  // Listen for the welcome tour tool being executed and trigger the client-side event.
  useEffect(() => {
    for (const m of messages) {
      if (m.role !== 'user') {
        const msgAny = m as any;
        const hasTourToolResult = 
          (msgAny.parts && msgAny.parts.some((part: any) => {
            const isWelcomeTour =
              part.type === 'tool-start_welcome_tour' ||
              part.toolName === 'start_welcome_tour';
            const isSuccess = isWelcomeTour && (
              (part.state === 'output-available' && part.output?.success) ||
              (part.type === 'tool-result' && part.result?.success)
            );
            return isSuccess;
          })) ||
          (msgAny.toolInvocations && msgAny.toolInvocations.some((inv: any) => {
            return inv.toolName === 'start_welcome_tour' && inv.state === 'result' && inv.result?.success;
          }));
        
        if (hasTourToolResult && !triggeredToursRef.current.has(m.id)) {
          triggeredToursRef.current.add(m.id)
          // Trigger the tour!
          window.dispatchEvent(new CustomEvent('mp:start-onboarding-tour'))
          // Minimize the sidekick so the user can see the tour overlay
          setIsOpen(false)
          break
        }
      }
    }
  }, [messages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function send(text: string) {
    if (!text.trim() || isLoading) return
    setInputValue("")
    await sendMessage({ text }, { body: { page: pageLabelFromPath(pathname), conversationId: convoId } })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await send(inputValue.trim())
  }

  function renderToolPart(toolPart: any, idx: number) {
    const name = String(toolPart.type).replace(/^tool-/, '')
    const label = TOOL_LABELS[name] || name.replace(/_/g, ' ')
    const state = toolPart.state
    const done = state === 'output-available'
    const failed = state === 'output-error'
    const output = toolPart.output
    const needsConfirm = output && (output.needsConfirmation || output.error)

    return (
      <div
        key={idx}
        className={`mt-2 flex items-center gap-2 text-xs rounded-lg px-2.5 py-1.5 border ${
          failed || (output && output.error)
            ? 'text-error-600 bg-error-500/10 border-error-200'
            : done
            ? 'text-success-700 bg-success-500/10 border-success-200'
            : 'text-foreground-muted bg-background-tertiary border-border'
        }`}
      >
        {done ? (
          needsConfirm ? <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-warning-600" /> : <Check className="w-3.5 h-3.5 shrink-0" />
        ) : failed ? (
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
        )}
        <span className="font-medium">{label}</span>
        {done && output && typeof output === 'object' && (
          <span className="text-foreground-muted truncate">
            {output.error
              ? `— ${output.error}`
              : output.message
              ? `— ${output.message}`
              : output.found !== undefined
              ? `— ${output.found} found${output.imported ? `, ${output.imported} imported` : ''}`
              : ''}
          </span>
        )}
      </div>
    )
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl bg-brand-600 hover:bg-brand-700 p-0 flex items-center justify-center z-50"
        style={{ animation: 'bounce 2s infinite' }}
      >
        <Sparkles className="h-6 w-6 text-white" />
      </Button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-[420px] h-[640px] max-h-[85vh] bg-background border border-border shadow-2xl rounded-2xl flex flex-col overflow-hidden z-50">
      {/* Header */}
      <div className="bg-brand-600 text-white p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          <span className="font-semibold tracking-tight">AI Sidekick</span>
          <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">agentic</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={startNewChat} title="New chat">
            <PlusCircle className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => setIsOpen(false)} title="Minimize">
            <Minimize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background-tertiary">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center text-foreground-muted px-2">
            <Bot className="h-12 w-12 mb-3 opacity-50" />
            <p className="font-medium text-foreground">Your autonomous growth operator.</p>
            <p className="text-sm mt-1 mb-4">I can find leads, build & launch agents, and run your whole pipeline.</p>
            <div className="w-full space-y-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="w-full text-left text-xs p-2.5 rounded-lg bg-background border border-border hover:border-brand-300 text-foreground-secondary transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role !== 'user' && (
              <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-brand-600 dark:text-brand-400" />
              </div>
            )}

            <div className={`p-3 rounded-2xl max-w-[85%] text-sm ${
              m.role === 'user'
                ? 'bg-foreground text-background rounded-tr-sm'
                : 'bg-background border border-border rounded-tl-sm shadow-sm text-foreground'
            }`}>
              {m.parts.map((part, idx) => {
                if (part.type === 'text') {
                  return <span key={idx} className="whitespace-pre-wrap">{part.text}</span>
                }
                if (part.type.startsWith('tool-')) {
                  return renderToolPart(part as any, idx)
                }
                return null
              })}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-foreground-muted pl-11">
            <Wrench className="w-3.5 h-3.5 animate-pulse" /> working…
          </div>
        )}

        {error && (
          <div className="text-error-600 text-xs p-3 bg-error-500/10 rounded-md text-center">
            Something went wrong. Ensure your LLM API key is configured in Settings.
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 bg-background border-t border-border">
        <div className="relative flex items-center">
          <input
            className="w-full pr-12 h-12 pl-4 text-sm bg-background-tertiary border border-border focus:outline-none focus:border-brand-500 rounded-xl text-foreground placeholder:text-foreground-muted"
            value={inputValue}
            placeholder="Ask me to do anything…"
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !inputValue.trim()}
            className="absolute right-1.5 h-9 w-9 rounded-lg bg-brand-600 hover:bg-brand-700"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Send className="h-4 w-4 text-white" />}
          </Button>
        </div>
      </form>
    </div>
  )
}
