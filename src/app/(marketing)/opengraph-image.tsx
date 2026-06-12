import { ImageResponse } from "next/og";

export const alt = "ColdPegion — Your AI sales team, on autopilot";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #020617 0%, #0f172a 55%, #1e1b4b 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 7h.01" />
              <path d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20" />
              <path d="m20 7 2 .5-2 .5" />
              <path d="M10 18v3" />
              <path d="M14 17.75V21" />
              <path d="M7 18a6 6 0 0 0 3.84-10.61" />
            </svg>
          </div>
          <div style={{ color: "#f8fafc", fontSize: 36, fontWeight: 700 }}>
            ColdPegion
          </div>
        </div>
        <div
          style={{
            marginTop: 48,
            color: "#f8fafc",
            fontSize: 76,
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: "-2px",
          }}
        >
          Your AI sales team,
        </div>
        <div
          style={{
            color: "#818cf8",
            fontSize: 76,
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: "-2px",
          }}
        >
          on autopilot.
        </div>
        <div style={{ marginTop: 40, color: "#94a3b8", fontSize: 30 }}>
          MCP-native cold outreach · Runs inside Claude · Apollo + any connector
        </div>
      </div>
    ),
    { ...size }
  );
}
