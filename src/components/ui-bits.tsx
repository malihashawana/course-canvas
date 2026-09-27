import type { ReactNode } from "react";

export const STATUS_LABELS: Record<string, string> = {
  uploaded: "Uploaded",
  pending: "Pending",
  missing: "Missing",
  scheduled: "Scheduled",
  open: "Open",
  in_review: "In Review",
  waiting_info: "Waiting for Info",
  resolved: "Resolved",
  closed: "Closed",
};

const TONE: Record<string, string> = {
  uploaded: "text-success border-success/40 bg-success/10",
  resolved: "text-success border-success/40 bg-success/10",
  closed: "text-muted-foreground border-border bg-elevated",
  pending: "text-warning border-warning/40 bg-warning/10",
  waiting_info: "text-warning border-warning/40 bg-warning/10",
  scheduled: "text-info border-info/40 bg-info/10",
  in_review: "text-info border-info/40 bg-info/10",
  open: "text-accent border-accent/40 bg-accent/10",
  missing: "text-destructive border-destructive/40 bg-destructive/10",
};

export function StatusChip({ status }: { status: string }) {
  return (
    <span className={`chip ${TONE[status] ?? "text-muted-foreground"}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function ProgressRing({ value, size = 72 }: { value: number; size?: number }) {
  const radius = (size - 9) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={7}
          className="stroke-secondary"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="stroke-primary transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <span className="absolute font-display text-sm font-semibold">{value}%</span>
    </div>
  );
}

export function StatBar({
  uploaded,
  pending,
  scheduled,
  missing,
}: {
  uploaded: number;
  pending: number;
  scheduled: number;
  missing: number;
}) {
  const total = Math.max(1, uploaded + pending + scheduled + missing);
  const segment = (count: number, className: string) =>
    count > 0 ? <span className={className} style={{ width: `${(count / total) * 100}%` }} /> : null;

  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-secondary">
      {segment(uploaded, "bg-success")}
      {segment(scheduled, "bg-info")}
      {segment(pending, "bg-warning")}
      {segment(missing, "bg-destructive")}
    </div>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`panel p-5 ${className}`}>{children}</section>;
}

export function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
