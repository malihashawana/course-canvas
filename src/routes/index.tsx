import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { staffLogin, studentLogin } from "@/lib/auth.functions";
import { getCourseActivity } from "@/lib/courses.functions";
import { Panel, ProgressRing, StatBar } from "@/components/ui-bits";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Student Support Hub — HSC 28 | 10 Minute School" },
      {
        name: "description",
        content:
          "Report a problem, track your ticket and follow live HSC 28 class upload status for all 14 subjects.",
      },
      { property: "og:title", content: "Student Support Hub — HSC 28" },
      {
        property: "og:description",
        content: "One place for HSC 28 student issues and live course upload status.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const doStudentLogin = useServerFn(studentLogin);
  const doStaffLogin = useServerFn(staffLogin);

  const [mode, setMode] = useState<"student" | "staff">("student");
  const [contact, setContact] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const activity = useQuery({ queryKey: ["activity"], queryFn: () => getCourseActivity({}) });
  const programs = activity.data ?? [];
  const totals = programs.reduce(
    (acc, program) => ({
      uploaded: acc.uploaded + program.uploaded,
      pending: acc.pending + program.pending,
      scheduled: acc.scheduled + program.scheduled,
      missing: acc.missing + program.missing,
      total: acc.total + program.total,
    }),
    { uploaded: 0, pending: 0, scheduled: 0, missing: 0, total: 0 },
  );
  const overall = totals.total === 0 ? 0 : Math.round((totals.uploaded / totals.total) * 100);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      if (mode === "student") {
        const result = await doStudentLogin({ data: { contact } });
        if (!result.ok) setError(result.message);
        else navigate({ to: "/student" });
      } else {
        const result = await doStaffLogin({ data: { username, password } });
        if (!result.ok) setError(result.message);
        else navigate({ to: "/staff" });
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 lg:grid-cols-[1.15fr_0.85fr] lg:py-16">
        <div>
          <span className="chip text-primary">HSC 28 · Batch support</span>
          <h1 className="mt-5 font-display text-4xl leading-tight font-semibold sm:text-5xl">
            One hub for every <span className="text-gradient">HSC 28</span> problem and every class
            upload.
          </h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Students report issues with a ticket they can track. The support team answers, and the live
            course board shows exactly which class of which subject is uploaded, pending or missing.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Panel className="flex items-center gap-4">
              <ProgressRing value={overall} size={64} />
              <div className="text-sm">
                <p className="font-display font-semibold">Upload progress</p>
                <p className="text-muted-foreground">{totals.total} tracked classes</p>
              </div>
            </Panel>
            <Panel>
              <p className="font-display text-2xl font-semibold text-success">{totals.uploaded}</p>
              <p className="text-sm text-muted-foreground">Classes uploaded</p>
            </Panel>
            <Panel>
              <p className="font-display text-2xl font-semibold text-warning">
                {totals.pending + totals.missing}
              </p>
              <p className="text-sm text-muted-foreground">Waiting to be uploaded</p>
            </Panel>
          </div>

          <Panel className="mt-4">
            <div className="mb-3 flex items-center justify-between text-sm">
              <p className="font-display font-semibold">Subject board</p>
              <Link to="/activity" className="text-primary">
                Open course activity →
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {programs.slice(0, 6).map((program) => (
                <div key={program.id} className="rounded-xl border border-border bg-elevated p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{program.subject_name_en}</span>
                    <span className="text-muted-foreground">{program.progress}%</span>
                  </div>
                  <div className="mt-2">
                    <StatBar
                      uploaded={program.uploaded}
                      pending={program.pending}
                      scheduled={program.scheduled}
                      missing={program.missing}
                    />
                  </div>
                </div>
              ))}
              {programs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Loading subject board…</p>
              ) : null}
            </div>
          </Panel>
        </div>

        <Panel className="h-fit lg:sticky lg:top-24">
          <div className="mb-5 flex gap-2 rounded-xl border border-border bg-elevated p-1 text-sm">
            <button
              className={`flex-1 rounded-lg px-3 py-2 transition-colors ${mode === "student" ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground"}`}
              onClick={() => setMode("student")}
            >
              Student login
            </button>
            <button
              className={`flex-1 rounded-lg px-3 py-2 transition-colors ${mode === "staff" ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground"}`}
              onClick={() => setMode("staff")}
            >
              Support team
            </button>
          </div>

          {mode === "student" ? (
            <div className="space-y-3">
              <label className="block text-sm text-muted-foreground" htmlFor="contact">
                Contact / login number
              </label>
              <input
                id="contact"
                className="field"
                placeholder="01XXXXXXXXX"
                value={contact}
                onChange={(event) => setContact(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && submit()}
              />
              <p className="text-xs text-muted-foreground">
                Use the number registered with your HSC 28 batch.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                className="field"
                placeholder="Username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
              <input
                className="field"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && submit()}
              />
            </div>
          )}

          {error ? (
            <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <button className="btn-primary mt-5 w-full" disabled={busy} onClick={submit}>
            {busy ? "Checking…" : mode === "student" ? "Continue" : "Log in"}
          </button>

          <Link to="/activity" className="btn-ghost mt-3 w-full">
            View course activity without logging in
          </Link>
        </Panel>
      </div>
    </div>
  );
}
