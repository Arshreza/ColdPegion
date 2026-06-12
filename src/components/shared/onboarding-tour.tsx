"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Building,
  Mail,
  Box,
  Bot,
  ChevronRight,
  ChevronLeft,
  X,
  Minus,
  Maximize2,
  CheckCircle2,
  Play,
  Settings
} from "lucide-react";

interface TourStep {
  title: string;
  description: string;
  path: string;
  targetId: string;
  instruction: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to ColdPegion! 🚀",
    description: "Let's set up your automated outreach system in 5 quick steps. We'll guide you through configuring your AI models, company profile, email accounts, products, and sequence agents.",
    path: "/dashboard",
    targetId: "",
    instruction: "Welcome"
  },
  {
    title: "Step 1: LLM Key Configuration 🔑",
    description: "Configure your API keys. ColdPegion requires an OpenAI-compatible API key (or Groq, open-source model base URLs) to generate personalized outbound emails, draft sequences, and categorize replies.",
    path: "/dashboard/settings",
    targetId: "onboarding-llm-config",
    instruction: "Enter your API Base URL, model name (e.g. gpt-4o), and API Key, then click 'Save LLM Config' to activate your AI engine."
  },
  {
    title: "Step 2: Company Profile 🏢",
    description: "Describe your business. The AI growth assistant uses these details (value propositions, target markets, tone of voice) to write highly personalized cold email copy.",
    path: "/dashboard/company",
    targetId: "onboarding-company-card",
    instruction: "Provide your company name, website, and description. Try auto-generating it from your site!"
  },
  {
    title: "Step 3: Connect Senders ✉️",
    description: "Link your sending mailboxes. ColdPegion supports Google Workspace/Gmail, Resend API key, and standard SMTP relays (SendGrid, Mailgun) to distribute your sending volume.",
    path: "/dashboard/accounts",
    targetId: "onboarding-connect-email",
    instruction: "Click 'Connect Account' to link your first sender mailbox. The worker load-balances emails automatically."
  },
  {
    title: "Step 4: Define Offerings 📦",
    description: "Add the products or services you want to market. You can specify structured ideal customer profile (ICP) filters to target precise job titles, seniorities, and locations.",
    path: "/dashboard/products",
    targetId: "onboarding-add-product",
    instruction: "Click 'Add Product' to define what you are selling. The AI uses this to personalize outreach templates."
  },
  {
    title: "Step 5: Launch Sequence Agent 🤖",
    description: "Build your AI Agent. Select your product, choose your prospect list, define follow-up steps, and activate your campaign to start automated outbound sends!",
    path: "/dashboard/agents",
    targetId: "onboarding-launch-agent",
    instruction: "Click 'Create Agent' to launch your first sequence. The background worker will stagger and deliver your emails automatically."
  }
];

export function OnboardingTour() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const userId = session?.user?.id;

  const [isActive, setIsActive] = useState(false);
  const [step, setStep] = useState(0);
  const [minimized, setMinimized] = useState(false);
  const [isCompletedShow, setIsCompletedShow] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  
  const popoverRef = useRef<HTMLDivElement>(null);

  // Helper to get namespaced localStorage keys
  const getKeys = () => {
    const suffix = userId ? `_${userId}` : "";
    return {
      completed: `coldpegion_tour_completed${suffix}`,
      active: `coldpegion_tour_active${suffix}`,
      step: `coldpegion_tour_step${suffix}`
    };
  };

  // Initialize and check status once session is loaded
  useEffect(() => {
    if (status !== "authenticated" || !userId) return;

    const keys = getKeys();
    const isCompleted = localStorage.getItem(keys.completed) === "true";
    const isTourActive = localStorage.getItem(keys.active) === "true";
    const savedStep = localStorage.getItem(keys.step);

    if (isTourActive) {
      setIsActive(true);
      if (savedStep) {
        setStep(parseInt(savedStep, 10));
      }
    } else if (!isCompleted && !isTourActive) {
      // First-time user greeting modal (only on root dashboard page)
      if (pathname === "/dashboard") {
        setIsActive(true);
        setStep(0);
        localStorage.setItem(keys.active, "true");
        localStorage.setItem(keys.step, "0");
      }
    }
  }, [pathname, userId, status]);

  // Listen for the custom event to start/restart the tour (e.g. from the AI Sidekick)
  useEffect(() => {
    if (!userId) return;

    const handleStartTour = () => {
      const keys = getKeys();
      localStorage.removeItem(keys.completed);
      localStorage.setItem(keys.active, "true");
      localStorage.setItem(keys.step, "0");
      setIsActive(true);
      setStep(0);
      setMinimized(false);
      setIsCompletedShow(false);
      if (window.location.pathname !== "/dashboard") {
        router.push("/dashboard");
      }
    };

    window.addEventListener("mp:start-onboarding-tour", handleStartTour);
    return () => window.removeEventListener("mp:start-onboarding-tour", handleStartTour);
  }, [router, userId]);

  // Handle dynamic positioning of popover and highlighting target elements
  useEffect(() => {
    if (!isActive || step === 0 || minimized || isCompletedShow) {
      setCoords(null);
      return;
    }

    const currentStepConfig = TOUR_STEPS[step];
    const targetId = currentStepConfig.targetId;
    const isCorrectPage = pathname === currentStepConfig.path;

    if (!isCorrectPage) {
      setCoords(null);
      return;
    }

    const el = document.getElementById(targetId);

    const updatePosition = () => {
      const targetEl = document.getElementById(targetId);
      if (targetEl && popoverRef.current) {
        const rect = targetEl.getBoundingClientRect();
        const popoverWidth = 360;
        
        // Default position: directly below the element, centered
        let top = rect.bottom + window.scrollY + 16;
        let left = rect.left + window.scrollX + (rect.width / 2) - (popoverWidth / 2);

        // Position safeguards to keep popover inside the viewport
        if (left < 16) left = 16;
        if (left + popoverWidth > window.innerWidth - 16) {
          left = window.innerWidth - popoverWidth - 16;
        }

        // If it overlaps or goes too far down, position to the right or above
        if (top + 200 > window.innerHeight + window.scrollY) {
          top = rect.top + window.scrollY - 200; // place above
        }

        setCoords({ top, left });
      } else {
        setCoords(null);
      }
    };

    if (el) {
      // Highlight targeted element
      el.classList.add(
        "relative",
        "z-[9990]",
        "ring-4",
        "ring-brand-500",
        "ring-offset-4",
        "dark:ring-offset-slate-950",
        "transition-all",
        "duration-300",
        "shadow-2xl",
        "shadow-brand-500/20"
      );

      // Trigger initial positioning
      setTimeout(updatePosition, 100);

      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition);
    } else {
      setCoords(null);
    }

    return () => {
      if (el) {
        el.classList.remove(
          "relative",
          "z-[9990]",
          "ring-4",
          "ring-brand-500",
          "ring-offset-4",
          "dark:ring-offset-slate-950",
          "shadow-2xl",
          "shadow-brand-500/20"
        );
      }
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition);
    };
  }, [isActive, step, pathname, minimized, isCompletedShow]);

  const handleNext = () => {
    const nextStep = step + 1;
    const keys = getKeys();
    if (nextStep < TOUR_STEPS.length) {
      setStep(nextStep);
      localStorage.setItem(keys.step, nextStep.toString());
      router.push(TOUR_STEPS[nextStep].path);
    } else {
      // Completed last step
      setIsCompletedShow(true);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      const prevStep = step - 1;
      const keys = getKeys();
      setStep(prevStep);
      localStorage.setItem(keys.step, prevStep.toString());
      router.push(TOUR_STEPS[prevStep].path);
    }
  };

  const handleSkip = () => {
    const keys = getKeys();
    setIsActive(false);
    localStorage.setItem(keys.completed, "true");
    localStorage.removeItem(keys.active);
    localStorage.removeItem(keys.step);
  };

  const handleFinish = () => {
    const keys = getKeys();
    setIsActive(false);
    setIsCompletedShow(false);
    localStorage.setItem(keys.completed, "true");
    localStorage.removeItem(keys.active);
    localStorage.removeItem(keys.step);
    router.push("/dashboard");
  };

  if (!isActive) return null;

  // Step 0: Welcome Modal (Only rendered on the dashboard root)
  if (step === 0 && !isCompletedShow) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm animate-fade-in p-4">
        <div className="w-full max-w-lg bg-background border border-border rounded-2xl shadow-2xl p-8 text-center relative overflow-hidden">
          {/* Subtle brand glow in the background */}
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-brand-500/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-accent-500/10 rounded-full blur-2xl" />

          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 text-foreground-muted hover:text-foreground p-1 transition-colors"
            title="Skip Tour"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="mx-auto w-16 h-16 bg-brand-500/10 rounded-2xl flex items-center justify-center text-brand-500 mb-6 border border-brand-500/20 shadow-lg shadow-brand-500/5">
            <Sparkles className="w-8 h-8 animate-pulse" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-foreground bg-gradient-to-r from-brand-400 to-accent-500 bg-clip-text text-transparent mb-3">
            Welcome to ColdPegion!
          </h1>
          <p className="text-foreground-secondary text-sm leading-relaxed mb-8">
            Let&apos;s get your cold outreach campaign configured in 5 quick steps. We&apos;ll walk you through setting up your AI models, company profile, email accounts, products, and sequence agents.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={handleNext}
              className="px-6 py-5 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-brand-600/10"
            >
              <Play className="w-4 h-4 fill-white" /> Start Tour (5 steps)
            </Button>
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="px-6 py-5 text-foreground-secondary hover:text-foreground"
            >
              Skip and explore on my own
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Completion Screen (Step 5 "Finish" click or finish state)
  if (isCompletedShow) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm animate-fade-in p-4">
        <div className="w-full max-w-md bg-background border border-border rounded-2xl shadow-2xl p-8 text-center relative overflow-hidden">
          <div className="mx-auto w-16 h-16 bg-success-500/10 rounded-2xl flex items-center justify-center text-success-500 mb-6 border border-success-500/20 shadow-lg">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-3">You&apos;re Ready to Fly! ✈️</h2>
          <p className="text-foreground-secondary text-sm leading-relaxed mb-8">
            You&apos;ve completed the setup walkthrough. Your API keys are set, company profile configured, email connections established, products defined, and sequences ready. Start creating your campaigns to scale your growth!
          </p>

          <Button
            onClick={handleFinish}
            className="w-full py-6 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl"
          >
            Go to Dashboard 🎉
          </Button>
        </div>
      </div>
    );
  }

  const currentStep = TOUR_STEPS[step];
  const isCorrectPage = pathname === currentStep.path;

  // Render Minimized Tour Control Bubble (Or floats if on the wrong page)
  if (minimized || !isCorrectPage) {
    return (
      <div className="fixed bottom-6 right-20 z-[9999] animate-bounce-soft">
        <div className="flex items-center gap-3 bg-slate-900 border border-slate-700/60 shadow-2xl rounded-2xl px-4 py-3 text-sm text-white backdrop-blur-md">
          <div className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-ping" />
          <div className="w-2.5 h-2.5 absolute left-4 rounded-full bg-brand-500" />
          
          <div className="flex flex-col pr-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
              Welcome Tour ({step}/5)
            </span>
            <span className="text-xs text-slate-300 font-medium">
              {!isCorrectPage ? "Redirect needed" : "Tour is minimized"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 border-l border-slate-700 pl-3">
            {!isCorrectPage ? (
              <Button
                size="sm"
                onClick={() => router.push(currentStep.path)}
                className="h-7 px-2.5 text-xs bg-brand-600 hover:bg-brand-700 text-white"
              >
                Go to page
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => setMinimized(false)}
                className="h-7 px-2.5 text-xs bg-slate-800 hover:bg-slate-700 text-white border border-slate-600"
              >
                <Maximize2 className="w-3 h-3 mr-1" /> Resume
              </Button>
            )}
            <button
              onClick={handleSkip}
              className="text-slate-400 hover:text-white p-1"
              title="End Tour"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active Step Guide Overlay and Floating Card
  return (
    <>
      {/* Semi-transparent Dimming Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/40 z-[9980] backdrop-blur-[1px] transition-opacity"
        onClick={() => setMinimized(true)}
        title="Click to minimize onboarding helper"
      />

      {/* Floating Guidance Card */}
      <div
        ref={popoverRef}
        style={
          coords
            ? {
                position: "absolute",
                top: `${coords.top}px`,
                left: `${coords.left}px`,
              }
            : {
                position: "fixed",
                bottom: "80px",
                right: "24px",
              }
        }
        className="z-[9990] w-[360px] bg-slate-900/95 border border-slate-700/60 shadow-2xl rounded-2xl p-5 text-white backdrop-blur-md animate-fade-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-brand-400 text-xs font-semibold uppercase tracking-wider">
            {step === 1 && <Settings className="w-3.5 h-3.5" />}
            {step === 2 && <Building className="w-3.5 h-3.5" />}
            {step === 3 && <Mail className="w-3.5 h-3.5" />}
            {step === 4 && <Box className="w-3.5 h-3.5" />}
            {step === 5 && <Bot className="w-3.5 h-3.5" />}
            Step {step} of 5
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMinimized(true)}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              title="Minimize Tour"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              onClick={handleSkip}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              title="End Tour"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Card Content */}
        <h3 className="text-base font-bold mb-1.5 text-slate-100">
          {currentStep.title}
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed mb-3">
          {currentStep.description}
        </p>

        {/* Tip / Prompt Section */}
        <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-3 mb-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400 block mb-1">
            How it works:
          </span>
          <p className="text-xs text-slate-200">
            {currentStep.instruction}
          </p>
        </div>

        {/* Tour Progress Bar */}
        <div className="h-1 w-full bg-slate-800 rounded-full mb-4 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all duration-300"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>

        {/* Button Controls */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleBack}
            disabled={step <= 1}
            className="text-slate-400 hover:text-white hover:bg-slate-800 h-8 px-2 text-xs gap-1 disabled:opacity-30"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </Button>

          <Button
            size="sm"
            onClick={handleNext}
            className="bg-brand-600 hover:bg-brand-700 text-white font-medium h-8 px-3 text-xs gap-1 shadow-md shadow-brand-600/10"
          >
            {step === 5 ? "Finish Tour" : "Next Step"} <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </>
  );
}
