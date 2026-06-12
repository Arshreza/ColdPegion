import {
  BrainCircuit,
  Globe,
  Inbox,
  Mail,
  Search,
  Send,
  Sparkles,
  Target,
  type LucideIcon,
} from "lucide-react";

function OrbitItem({
  icon: Icon,
  label,
  angle,
  radius,
  reverse,
}: {
  icon: LucideIcon;
  label: string;
  angle: number;
  radius: number;
  reverse?: boolean;
}) {
  return (
    <div
      className="absolute left-1/2 top-1/2"
      style={{ transform: `rotate(${angle}deg)` }}
    >
      <div style={{ transform: `translateX(${radius}px)` }}>
        <div style={{ transform: `translate(-50%, -50%) rotate(${-angle}deg)` }}>
          <div
            className={`${reverse ? "orbit-counter-rev" : "orbit-counter"} flex items-center gap-1.5 rounded-full border border-border bg-background-secondary px-2.5 py-1.5 text-[11px] font-semibold text-foreground shadow-md whitespace-nowrap`}
          >
            <Icon className="h-3.5 w-3.5 text-brand-500" />
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Claude at the center, connectors orbiting on two counter-rotating rings. */
export function Orbit() {
  return (
    <div className="relative mx-auto flex aspect-square w-full max-w-[460px] items-center justify-center">
      {/* ring guides */}
      <div className="absolute inset-[12%] rounded-full border border-dashed border-border" aria-hidden />
      <div className="absolute inset-[31%] rounded-full border border-dashed border-border" aria-hidden />

      {/* center: Claude + ColdPegion MCP */}
      <div className="relative z-10 flex flex-col items-center">
        <span className="absolute inset-0 -z-10 rounded-2xl gradient-brand animate-pulse-ring" aria-hidden />
        <div className="flex flex-col items-center gap-1 rounded-2xl gradient-brand px-5 py-4 text-white shadow-xl glow-brand">
          <Sparkles className="h-6 w-6" />
          <span className="text-sm font-bold">Claude</span>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold tracking-wide">
            ColdPegion MCP
          </span>
        </div>
      </div>

      {/* inner ring */}
      <div
        className="orbit-ring absolute inset-0"
        style={{ "--orbit-duration": "22s" } as React.CSSProperties}
        aria-hidden
      >
        <OrbitItem icon={Target} label="Apollo" angle={0} radius={88} />
        <OrbitItem icon={Globe} label="Web search" angle={120} radius={88} />
        <OrbitItem icon={Search} label="Your CRM" angle={240} radius={88} />
      </div>

      {/* outer ring (counter-rotating) */}
      <div
        className="orbit-ring-rev absolute inset-0"
        style={{ "--orbit-duration": "34s" } as React.CSSProperties}
        aria-hidden
      >
        <OrbitItem icon={Mail} label="Gmail" angle={0} radius={176} reverse />
        <OrbitItem icon={Inbox} label="Outlook" angle={72} radius={176} reverse />
        <OrbitItem icon={Send} label="Resend" angle={144} radius={176} reverse />
        <OrbitItem icon={BrainCircuit} label="Any LLM" angle={216} radius={176} reverse />
        <OrbitItem icon={Sparkles} label="Routines" angle={288} radius={176} reverse />
      </div>
    </div>
  );
}
