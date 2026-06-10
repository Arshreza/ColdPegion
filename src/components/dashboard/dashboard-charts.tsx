"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Mail, Reply, AlertTriangle } from "lucide-react";

interface ChartDataPoint {
  date: string;
  sent: number;
  replied: number;
  bounced: number;
}

interface DashboardChartsProps {
  data: ChartDataPoint[];
}

export function DashboardCharts({ data }: DashboardChartsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-[350px] w-full bg-background-secondary animate-pulse rounded-xl border border-border flex items-center justify-center text-foreground-muted text-sm">
        Loading analytics charts...
      </div>
    );
  }

  const totalSent = data.reduce((acc, curr) => acc + curr.sent, 0);
  const totalReplied = data.reduce((acc, curr) => acc + curr.replied, 0);
  const totalBounced = data.reduce((acc, curr) => acc + curr.bounced, 0);

  const isEmpty = totalSent === 0 && totalReplied === 0 && totalBounced === 0;

  if (isEmpty) {
    return (
      <div className="rounded-xl border border-border bg-background p-8 text-center min-h-[350px] flex flex-col items-center justify-center">
        <Mail className="h-12 w-12 text-foreground-muted/40 mb-4" />
        <h3 className="text-lg font-medium text-foreground">No campaign data yet</h3>
        <p className="mt-1 text-sm text-foreground-muted max-w-sm">
          Once your AI agents start sending out emails, you will see a daily breakdown of sends, replies, and bounces here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mini Overview Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-background border border-border rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Sent (Last 7d)</p>
            <p className="text-2xl font-bold text-foreground mt-1">{totalSent.toLocaleString()}</p>
          </div>
          <div className="p-2 bg-brand-500/10 rounded-lg">
            <Mail className="h-5 w-5 text-brand-600 dark:text-brand-400" />
          </div>
        </div>
        
        <div className="bg-background border border-border rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Replies (Last 7d)</p>
            <p className="text-2xl font-bold text-foreground mt-1">{totalReplied.toLocaleString()}</p>
          </div>
          <div className="p-2 bg-success-500/10 rounded-lg">
            <Reply className="h-5 w-5 text-success-600 dark:text-success-400" />
          </div>
        </div>

        <div className="bg-background border border-border rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Bounces (Last 7d)</p>
            <p className="text-2xl font-bold text-foreground mt-1">{totalBounced.toLocaleString()}</p>
          </div>
          <div className="p-2 bg-error-500/10 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-error-600 dark:text-error-400" />
          </div>
        </div>
      </div>

      {/* Chart container */}
      <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-semibold text-foreground">Email Performance</h2>
            <p className="text-xs text-foreground-muted">Daily breakdown of email interactions</p>
          </div>
        </div>

        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorReplied" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorBounced" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
              <XAxis 
                dataKey="date" 
                tickLine={false}
                axisLine={false}
                className="fill-foreground-muted text-xs font-medium"
              />
              <YAxis 
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                className="fill-foreground-muted text-xs font-medium"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "var(--background)", 
                  borderColor: "var(--border)",
                  borderRadius: "8px",
                  color: "var(--foreground)",
                  fontSize: "12px"
                }}
              />
              <Legend 
                verticalAlign="top"
                height={36}
                iconType="circle"
                iconSize={8}
                className="text-xs font-medium"
              />
              <Area 
                type="monotone" 
                dataKey="sent" 
                name="Sent"
                stroke="#4f46e5" 
                fillOpacity={1} 
                fill="url(#colorSent)" 
                strokeWidth={2}
              />
              <Area 
                type="monotone" 
                dataKey="replied" 
                name="Replied"
                stroke="#10b981" 
                fillOpacity={1} 
                fill="url(#colorReplied)" 
                strokeWidth={2}
              />
              <Area 
                type="monotone" 
                dataKey="bounced" 
                name="Bounced"
                stroke="#ef4444" 
                fillOpacity={1} 
                fill="url(#colorBounced)" 
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
