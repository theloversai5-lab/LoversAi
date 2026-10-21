import React from "react";
import { Link } from "react-router-dom";

export function Button({ variant = "primary", className = "", disabled, children, ...props }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40";
  const styles = {
    primary: "bg-white text-black hover:bg-white/85",
    secondary: "border border-[#222] bg-black text-white hover:border-white/40",
    ghost: "text-white/60 hover:text-white",
  };
  return (
    <button type="button" disabled={disabled} className={`${base} ${styles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Cost({ amount }) {
  if (!amount) return null;
  return (
    <span className="rounded border border-current px-1 text-[10px] opacity-60">
      {amount} credit{amount === 1 ? "" : "s"}
    </span>
  );
}

const STATUS_STYLE = {
  approved: "border-green-500/50 text-green-400",
  review: "border-amber-400/50 text-amber-300",
  needs_review: "border-amber-400/50 text-amber-300",
  rejected: "border-red-500/50 text-red-400",
  failed: "border-red-500/50 text-red-400",
};

export function StatusBadge({ status }) {
  if (!status) return null;
  return (
    <span
      className={`inline-block rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${
        STATUS_STYLE[status] || "border-[#333] text-white/60"
      }`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function Panel({ title, actions, children, className = "" }) {
  return (
    <section className={`rounded-lg border border-[#222] bg-black ${className}`}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#222] px-4 py-3">
          {title && <h2 className="text-sm font-medium text-white">{title}</h2>}
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Notice({ tone = "neutral", children }) {
  const tones = {
    neutral: "border-[#222] text-white/70",
    error: "border-red-500/40 text-red-300",
    warn: "border-amber-400/40 text-amber-200",
  };
  return <div className={`rounded-md border px-3 py-2 text-xs ${tones[tone]}`}>{children}</div>;
}

export function ErrorNotice({ error, cost, credits }) {
  if (!error) return null;
  if (error.status === 402 || error.code === "INSUFFICIENT_CREDITS") {
    return (
      <Notice tone="error">
        Not enough planner credits
        {cost ? ` (needs ${cost}${credits != null ? `, balance ${credits}` : ""})` : ""}.{" "}
        <Link to="/pricing" className="underline">
          Upgrade or top up
        </Link>
      </Notice>
    );
  }
  return <Notice tone="error">{error.message}</Notice>;
}

export function JobLine({ job }) {
  if (!job) return null;
  const active = ["queued", "running"].includes(job.status);
  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/60">
      {active && <span className="h-2 w-2 animate-pulse rounded-full bg-white" />}
      <span>{job.operation.replace(/_/g, " ")}</span>
      <StatusBadge status={job.status} />
      {job.error?.message && <span className="text-red-300">{job.error.message}</span>}
    </div>
  );
}

export function Verdict({ label, verdict }) {
  if (!verdict) return null;
  return (
    <div className="text-[11px] leading-relaxed text-white/60">
      <span className="text-white/80">{label}: </span>
      {verdict.decision}
      {verdict.category ? ` / ${verdict.category}` : ""}
      {verdict.reason ? ` - ${verdict.reason}` : ""}
      {Array.isArray(verdict.issues) && verdict.issues.length > 0 && (
        <span className="block text-white/40">Issues: {verdict.issues.join(", ")}</span>
      )}
    </div>
  );
}
