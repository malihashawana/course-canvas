import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { formatDate, Panel, SectionTitle, StatusChip } from "@/components/ui-bits";
import { getSession } from "@/lib/auth.functions";
import { listCourses } from "@/lib/courses.functions";
import { listNotices } from "@/lib/students.functions";
import {
  createTicket,
  myTickets,
  publicTickets,
  replyToTicket,
  ticketThread,
  TICKET_CATEGORIES,
} from "@/lib/tickets.functions";

export const Route = createFileRoute("/student")({
  head: () => ({
    meta: [
      { title: "My dashboard — HSC 28 Student Support Hub" },
      {
        name: "description",
        content: "Report a problem, track your HSC 28 tickets and read support notices.",
      },
      { property: "og:title", content: "My dashboard — HSC 28 Student Support Hub" },
      { property: "og:description", content: "Report and track HSC 28 support tickets." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentDashboard,
});

const TABS = ["Report a Problem", "My Issues", "Community", "Notices"] as const;

function StudentDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = useQuery({ queryKey: ["session"], queryFn: () => getSession({}) });
  const [tab, setTab] = useState<(typeof TABS)[number]>("Report a Problem");

  useEffect(() => {
    if (session.isSuccess && session.data?.role !== "student") navigate({ to: "/" });
  }, [session.isSuccess, session.data, navigate]);

  const tickets = useQuery({
    queryKey: ["myTickets"],
    queryFn: () => myTickets({}),
    enabled: session.data?.role === "student",
  });
  const courses = useQuery({ queryKey: ["courses"], queryFn: () => listCourses({}) });
  const community = useQuery({ queryKey: ["publicTickets"], queryFn: () => publicTickets({}) });
  const notices = useQuery({ queryKey: ["notices"], queryFn: () => listNotices({}) });

  const [form, setForm] = useState({
    category: TICKET_CATEGORIES[0] as string,
    title: "",
    description: "",
    courseId: "",
    classRef: "",
    attachmentUrl: "",
  });
  const [submitted, setSubmitted] = useState<{ ticket_no: string; status: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [openTicket, setOpenTicket] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const ticket = await createTicket({
        data: {
          category: form.category as (typeof TICKET_CATEGORIES)[number],
          title: form.title,
          description: form.description,
          courseId: form.courseId ? Number(form.courseId) : null,
          classRef: form.classRef,
          attachmentUrl: form.attachmentUrl,
        },
      });
      setSubmitted({ ticket_no: ticket.ticket_no, status: ticket.status });
      setForm({
        category: TICKET_CATEGORIES[0],
        title: "",
        description: "",
        courseId: "",
        classRef: "",
        attachmentUrl: "",
      });
      await queryClient.invalidateQueries({ queryKey: ["myTickets"] });
    } catch {
      setError("We could not submit your problem. Please check the fields and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell
      nav={[
        { to: "/student", label: "My dashboard" },
        { to: "/activity", label: "Course activity" },
      ]}
      user={
        session.data?.role === "student"
          ? { name: session.data.name, detail: session.data.contact }
          : null
      }
    >
      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`chip transition-colors ${tab === item ? "border-primary/50 text-primary" : "text-muted-foreground"}`}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === "Report a Problem" ? (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Panel>
            <SectionTitle title="Report a problem" hint="Please describe your problem clearly." />
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                className="field"
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value })}
              >
                {TICKET_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <select
                className="field"
                value={form.courseId}
                onChange={(event) => setForm({ ...form, courseId: event.target.value })}
              >
                <option value="">Related course (optional)</option>
                {(courses.data ?? []).map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.label}
                  </option>
                ))}
              </select>
              <input
                className="field sm:col-span-2"
                placeholder="Problem title — e.g. Physics class audio is not working"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
              <textarea
                className="field min-h-36 sm:col-span-2"
                placeholder="Describe your problem clearly."
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
              <input
                className="field"
                placeholder="Related class / exam (optional)"
                value={form.classRef}
                onChange={(event) => setForm({ ...form, classRef: event.target.value })}
              />
              <input
                className="field"
                placeholder="Screenshot / video link (optional)"
                value={form.attachmentUrl}
                onChange={(event) => setForm({ ...form, attachmentUrl: event.target.value })}
              />
            </div>

            {error ? (
              <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <button className="btn-primary mt-4" disabled={busy} onClick={submit}>
              {busy ? "Submitting…" : "Submit Problem"}
            </button>
          </Panel>

          <Panel>
            <SectionTitle title="What happens next" />
            {submitted ? (
              <div className="rounded-xl border border-success/40 bg-success/10 p-4 text-sm">
                <p className="font-medium text-success">Your problem has been submitted successfully.</p>
                <p className="mt-2">
                  Ticket ID: <span className="font-display font-semibold">{submitted.ticket_no}</span>
                </p>
                <p className="mt-1">
                  Status: <StatusChip status={submitted.status} />
                </p>
              </div>
            ) : (
              <ol className="space-y-3 text-sm text-muted-foreground">
                <li>1. You get a ticket ID to track your problem.</li>
                <li>2. The support team reviews and replies inside the ticket.</li>
                <li>3. You are notified in "My Issues" when it is resolved.</li>
              </ol>
            )}
          </Panel>
        </div>
      ) : null}

      {tab === "My Issues" ? (
        <Panel>
          <SectionTitle title="My issues" hint="Every problem you reported and its current status." />
          <div className="space-y-2">
            {(tickets.data ?? []).map((ticket) => (
              <div key={ticket.id} className="rounded-xl border border-border bg-elevated p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-display font-semibold">{ticket.ticket_no}</span>
                  <StatusChip status={ticket.status} />
                </div>
                <p className="mt-1 text-sm">{ticket.title}</p>
                <p className="text-xs text-muted-foreground">
                  {ticket.category} · {formatDate(ticket.created_at)}
                </p>
                <button
                  className="mt-2 text-xs text-primary"
                  onClick={() => setOpenTicket(openTicket === ticket.id ? null : ticket.id)}
                >
                  {openTicket === ticket.id ? "Hide conversation" : "Open conversation"}
                </button>
                {openTicket === ticket.id ? <Thread ticketId={ticket.id} /> : null}
              </div>
            ))}
            {(tickets.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">You have not reported any problem yet.</p>
            ) : null}
          </div>
        </Panel>
      ) : null}

      {tab === "Community" ? (
        <Panel>
          <SectionTitle
            title="Already reported problems"
            hint="Check if your issue is already known before reporting it."
          />
          <div className="grid gap-2 sm:grid-cols-2">
            {(community.data ?? []).map((ticket) => (
              <div key={ticket.id} className="rounded-xl border border-border bg-elevated p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="chip text-muted-foreground">{ticket.category}</span>
                  <StatusChip status={ticket.status} />
                </div>
                <p className="mt-2 font-medium">{ticket.title}</p>
                <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{ticket.description}</p>
              </div>
            ))}
            {(community.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No public problems yet.</p>
            ) : null}
          </div>
        </Panel>
      ) : null}

      {tab === "Notices" ? (
        <Panel>
          <SectionTitle title="Support notices" />
          <div className="space-y-3">
            {(notices.data ?? [])
              .filter((notice) => notice.published)
              .map((notice) => (
                <div key={notice.id} className="rounded-xl border border-border bg-elevated p-3">
                  <p className="font-medium">{notice.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{notice.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(notice.created_at)}</p>
                </div>
              ))}
          </div>
        </Panel>
      ) : null}
    </AppShell>
  );
}

export function Thread({ ticketId }: { ticketId: string }) {
  const queryClient = useQueryClient();
  const thread = useQuery({
    queryKey: ["thread", ticketId],
    queryFn: () => ticketThread({ data: { ticketId } }),
  });
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!body.trim()) return;
    setBusy(true);
    try {
      await replyToTicket({ data: { ticketId, body } });
      setBody("");
      await queryClient.invalidateQueries({ queryKey: ["thread", ticketId] });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      {(thread.data?.messages ?? []).map((message) => (
        <div
          key={message.id}
          className={`rounded-lg p-2.5 text-sm ${message.author_type === "staff" ? "bg-primary/10" : "bg-card"}`}
        >
          <p className="text-xs text-muted-foreground">
            {message.author_type === "staff" ? "Support Team" : (message.author_name ?? "Student")} ·{" "}
            {formatDate(message.created_at)}
          </p>
          <p className="mt-1 whitespace-pre-wrap">{message.body}</p>
        </div>
      ))}
      <div className="flex gap-2">
        <input
          className="field"
          placeholder="Write a message…"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && send()}
        />
        <button className="btn-primary" disabled={busy} onClick={send}>
          Send
        </button>
      </div>
    </div>
  );
}
