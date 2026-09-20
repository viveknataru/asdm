import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

const tone: Record<string, string> = {
  passed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
  skipped: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  running: "bg-sky-500/15 text-sky-400 border-sky-500/30 animate-pulse",
  pending: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-muted text-muted-foreground border-border",
};

const label: Record<string, string> = {
  passed: "PASS",
  failed: "FAIL",
  skipped: "SKIPPED",
  running: "RUNNING",
  pending: "PENDING",
  cancelled: "CANCELLED",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider",
        tone[status] ?? tone.pending,
        className,
      )}
    >
      {label[status] ?? status.toUpperCase()}
    </span>
  );
}

export function Metric({
  label: l,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
        <span>{l}</span>
        {icon}
      </div>
      <div className="mt-2 font-mono text-2xl font-semibold tabular-nums">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

/** Mock ASDM window rendering — stands in for a captured desktop screenshot. */
export function MockScreen({
  caseId,
  label: caption,
  failed,
  className,
}: {
  caseId: string;
  label: string;
  failed?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-md border border-border bg-[#0d1117]", className)}>
      <div className="flex items-center gap-1.5 border-b border-border bg-muted/40 px-2 py-1">
        <span className="h-2 w-2 rounded-full bg-destructive/70" />
        <span className="h-2 w-2 rounded-full bg-amber-500/70" />
        <span className="h-2 w-2 rounded-full bg-emerald-500/70" />
        <span className="ml-2 truncate font-mono text-[10px] text-muted-foreground">
          Cisco ASDM 7.20 — 10.10.20.1 — {caseId}
        </span>
      </div>
      <div className="space-y-1.5 p-3">
        <div className="h-2 w-1/3 rounded bg-sky-500/40" />
        <div className="grid grid-cols-3 gap-1.5">
          <div className="h-10 rounded bg-muted/50" />
          <div className="h-10 rounded bg-muted/40" />
          <div className="h-10 rounded bg-muted/30" />
        </div>
        <div className="h-2 w-2/3 rounded bg-muted/50" />
        <div className="h-2 w-1/2 rounded bg-muted/40" />
        <div
          className={cn(
            "mt-2 truncate rounded px-2 py-1 font-mono text-[10px]",
            failed ? "bg-destructive/20 text-destructive" : "bg-emerald-500/10 text-emerald-400",
          )}
        >
          {failed ? "✕ " : "✓ "}
          {caption}
        </div>
      </div>
    </div>
  );
}