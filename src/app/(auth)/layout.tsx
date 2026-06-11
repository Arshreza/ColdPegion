export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden gradient-brand">
        {/* Animated background shapes */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-white/8 rounded-full blur-2xl animate-pulse" style={{ animationDelay: "2s" }} />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7h.01" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="m20 7 2 .5-2 .5" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 18v3" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 17.75V21" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 18a6 6 0 0 0 3.84-10.61" />
                </svg>
              </div>
              <span className="text-2xl font-bold tracking-tight">ColdPigeon</span>
            </div>
            <h1 className="text-4xl font-bold leading-tight mb-4">
              Automate your email outreach with AI agents
            </h1>
            <p className="text-lg text-white/80 leading-relaxed max-w-md">
              Create intelligent agents that craft personalized cold emails,
              find prospects, and manage your outreach — all on autopilot.
            </p>
          </div>

          <div className="space-y-4 mt-8">
            {[
              "AI-generated personalized sequences",
              "Multi-product agent management",
              "Built-in prospect discovery",
              "Unified inbox with smart replies",
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-white/90">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-3 h-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <span className="text-sm font-medium">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Auth Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-md animate-fade-in">{children}</div>
      </div>
    </div>
  );
}
