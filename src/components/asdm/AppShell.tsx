import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Camera,
  FlaskConical,
  Gauge,
  LayoutDashboard,
  ListChecks,
  PlayCircle,
  ScrollText,
  Server,
  Settings as SettingsIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useLab } from "@/lib/asdm/store";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/environments", label: "Environments", icon: Server },
  { to: "/test-cases", label: "Test Cases", icon: ListChecks },
  { to: "/runner", label: "Test Runner", icon: PlayCircle },
  { to: "/suites", label: "Test Suites", icon: FlaskConical },
  { to: "/reports", label: "Reports", icon: Gauge },
  { to: "/logs", label: "Automation Logs", icon: ScrollText },
  { to: "/screenshots", label: "Screenshots", icon: Camera },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { environments, activeRunId, settings } = useLab();
  const mock = environments[0];

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-sidebar md:flex">
        <div className="flex items-center gap-2 border-b border-border px-4 py-4">
          <Activity className="h-5 w-5 text-sky-400" />
          <div className="leading-tight">
            <div className="text-sm font-semibold">ASDM Automation Lab</div>
            <div className="font-mono text-[10px] text-muted-foreground">GUI QA control plane</div>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 p-2">
          {nav.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-1 border-t border-border p-3 font-mono text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                mock?.connected ? "bg-emerald-400" : "bg-destructive",
              )}
            />
            {mock?.name}: {mock?.connected ? "connected" : "offline"}
          </div>
          <div>demo mode: {settings.demoMode ? "on" : "off"}</div>
          <div>runner: {activeRunId ? "executing" : "idle"}</div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 overflow-x-auto border-b border-border bg-card/60 px-4 py-2 md:hidden">
          {nav.map((item) => (
            <Link key={item.to} to={item.to} className="whitespace-nowrap text-xs text-muted-foreground">
              {item.label}
            </Link>
          ))}
        </header>
        <main className="mx-auto w-full max-w-[1400px] flex-1 space-y-6 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}