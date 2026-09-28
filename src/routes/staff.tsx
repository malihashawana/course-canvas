import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { formatDate, Panel, SectionTitle, StatBar, StatusChip } from "@/components/ui-bits";
import { Thread } from "@/routes/student";
import { getSession } from "@/lib/auth.functions";
import {
  addClass,
  deleteClass,
  getCourseActivity,
  setClassStatus,
  syncTenmsCatalog,
} from "@/lib/courses.functions";
import { createNotice, importStudents, listNotices, listStudents } from "@/lib/students.functions";
import { setTicketStatus, staffTickets, TICKET_STATUSES } from "@/lib/tickets.functions";

export const Route = createFileRoute("/staff")({
  head: () => ({
    meta: [
      { title: "Support desk — HSC 28 Student Support Hub" },
      {
        name: "description",
        content: "Support team desk: tickets, student database, class upload status and notices.",
      },
      { property: "og:title", content: "Support desk — HSC 28" },
      { property: "og:description", content: "Manage HSC 28 tickets and class upload status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StaffDashboard,
});

const TABS = ["Tickets", "Course uploads", "Students", "Notices"] as const;

function StaffDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = useQuery({ queryKey: ["session"], queryFn: () => getSession({}) });
  const [tab, setTab] = useState<(typeof TABS)[number]>("Tickets");

  useEffect(() => {
    if (session.isSuccess && session.data?.role !== "staff") navigate({ to: "/" });
  }, [session.isSuccess, session.data, navigate]);

  const isStaff = session.data?.role === "staff";
  const tickets = useQuery({ queryKey: ["staffTickets"], queryFn: () => staffTickets({}), enabled: isStaff });
  const activity = useQuery({ queryKey: ["activity"], queryFn: () => getCourseActivity({}) });
  const students = useQuery({ queryKey: ["students"], queryFn: () => listStudents({}), enabled: isStaff });
  const notices = useQuery({ queryKey: ["notices"], queryFn: () => listNotices({}) });

  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [openTicket, setOpenTicket] = useState<string | null>(null);
  const [csv, setCsv] = useState("");
  const [importResult, setImportResult] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState({ title: "", body: "" });
  const [classForm, setClassForm] = useState({
    courseId: "",
    title: "",
    classNo: "1",
    status: "pending",
    scheduledOn: "",
    resourceUrl: "",
  });

  const filteredTickets = useMemo(() => {
    const rows = tickets.data ?? [];
    const needle = search.trim().toLowerCase();
    return rows.filter(
      (ticket) =>
        (statusFilter === "all" || ticket.status === statusFilter) &&
        (needle === "" ||
          `${ticket.ticket_no} ${ticket.title} ${ticket.studentName} ${ticket.studentContact}`
            .toLowerCase()
            .includes(needle)),
    );
  }, [tickets.data, statusFilter, search]);

  const allCourses = (activity.data ?? []).flatMap((program) =>
    program.courses.map((course) => ({ id: course.id, label: `${program.subject_name_en} — ${course.name_en}` })),
  );

  function exportCsv() {
    const rows = [
      ["ticket_no", "student", "contact", "category", "title", "status", "created_at"],
      ...filteredTickets.map((ticket) => [
        ticket.ticket_no,
        ticket.studentName,
        ticket.studentContact,
        ticket.category,
        ticket.title.replace(/[",\n]/g, " "),
        ticket.status,
        ticket.created_at,
      ]),
    ];
    const blob = new Blob([rows.map((row) => row.join(",")).join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "hsc28-tickets.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell
      nav={[
        { to: "/staff", label: "Support desk" },
        { to: "/activity", label: "Course activity" },
      ]}
      user={isStaff ? { name: "Support Team", detail: "TENMS" } : null}
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

      {tab === "Tickets" ? (
        <Panel>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <SectionTitle title="All tickets" hint={`${filteredTickets.length} shown`} />
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <select
                className="field w-44"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">All statuses</option>
                {TICKET_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <input
                className="field w-56"
                placeholder="Search ticket, student, number"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <button className="btn-ghost" onClick={exportCsv}>
                Export CSV
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {filteredTickets.map((ticket) => (
              <div key={ticket.id} className="rounded-xl border border-border bg-elevated p-3">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-display font-semibold">{ticket.ticket_no}</span>
                  <span className="chip text-muted-foreground">{ticket.category}</span>
                  <span className="flex-1 truncate">{ticket.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {ticket.studentName} · {ticket.studentContact}
                  </span>
                  <select
                    className="field w-40"
                    value={ticket.status}
                    onChange={async (event) => {
                      await setTicketStatus({
                        data: {
                          ticketId: ticket.id,
                          status: event.target.value as (typeof TICKET_STATUSES)[number],
                        },
                      });
                      await queryClient.invalidateQueries({ queryKey: ["staffTickets"] });
                    }}
                  >
                    {TICKET_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{formatDate(ticket.created_at)}</span>
                  {ticket.attachment_url ? (
                    <a className="text-primary" href={ticket.attachment_url} target="_blank" rel="noreferrer">
                      Attachment
                    </a>
                  ) : null}
                  <button
                    className="text-primary"
                    onClick={() => setOpenTicket(openTicket === ticket.id ? null : ticket.id)}
                  >
                    {openTicket === ticket.id ? "Hide conversation" : "Reply"}
                  </button>
                </div>
                {openTicket === ticket.id ? <Thread ticketId={ticket.id} /> : null}
              </div>
            ))}
            {filteredTickets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tickets match this filter.</p>
            ) : null}
          </div>
        </Panel>
      ) : null}

      {tab === "Course uploads" ? (
        <div className="space-y-4">
          <Panel>
            <div className="flex flex-wrap items-center gap-3">
              <SectionTitle
                title="10 Minute School course sync"
                hint="Pulls the public course info for all 14 HSC 28 subjects."
              />
              <button
                className="btn-primary ml-auto"
                onClick={async () => {
                  setSyncMessage("Syncing…");
                  try {
                    const result = await syncTenmsCatalog({});
                    setSyncMessage(
                      `Synced ${result.synced} subjects${result.failed.length ? `, failed: ${result.failed.join(", ")}` : ""}.`,
                    );
                    await queryClient.invalidateQueries({ queryKey: ["activity"] });
                  } catch {
                    setSyncMessage("Sync failed. Please try again.");
                  }
                }}
              >
                Sync course info
              </button>
            </div>
            {syncMessage ? <p className="text-sm text-muted-foreground">{syncMessage}</p> : null}
          </Panel>

          <Panel>
            <SectionTitle title="Add a class" hint="Track one class and its upload status." />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <select
                className="field lg:col-span-2"
                value={classForm.courseId}
                onChange={(event) => setClassForm({ ...classForm, courseId: event.target.value })}
              >
                <option value="">Select course</option>
                {allCourses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.label}
                  </option>
                ))}
              </select>
              <input
                className="field"
                placeholder="Class number"
                value={classForm.classNo}
                onChange={(event) => setClassForm({ ...classForm, classNo: event.target.value })}
              />
              <input
                className="field lg:col-span-2"
                placeholder="Class title"
                value={classForm.title}
                onChange={(event) => setClassForm({ ...classForm, title: event.target.value })}
              />
              <select
                className="field"
                value={classForm.status}
                onChange={(event) => setClassForm({ ...classForm, status: event.target.value })}
              >
                {["uploaded", "pending", "scheduled", "missing"].map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <input
                className="field"
                type="date"
                value={classForm.scheduledOn}
                onChange={(event) => setClassForm({ ...classForm, scheduledOn: event.target.value })}
              />
              <input
                className="field lg:col-span-2"
                placeholder="Lecture / resource link (optional)"
                value={classForm.resourceUrl}
                onChange={(event) => setClassForm({ ...classForm, resourceUrl: event.target.value })}
              />
            </div>
            <button
              className="btn-primary mt-3"
              disabled={!classForm.courseId || !classForm.title}
              onClick={async () => {
                await addClass({
                  data: {
                    courseId: Number(classForm.courseId),
                    title: classForm.title,
                    classNo: Number(classForm.classNo) || 1,
                    status: classForm.status as "uploaded" | "pending" | "missing" | "scheduled",
                    scheduledOn: classForm.scheduledOn,
                    resourceUrl: classForm.resourceUrl,
                  },
                });
                setClassForm({ ...classForm, title: "", resourceUrl: "" });
                await queryClient.invalidateQueries({ queryKey: ["activity"] });
              }}
            >
              Add class
            </button>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            {(activity.data ?? []).map((program) => (
              <Panel key={program.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-display font-semibold">{program.subject_name_en}</p>
                    <p className="text-xs text-muted-foreground">
                      {program.uploaded}/{program.total} uploaded · {program.progress}%
                    </p>
                  </div>
                  <span className="chip text-muted-foreground">{program.stream}</span>
                </div>
                <div className="mt-3">
                  <StatBar
                    uploaded={program.uploaded}
                    pending={program.pending}
                    scheduled={program.scheduled}
                    missing={program.missing}
                  />
                </div>
                <div className="mt-3 space-y-3">
                  {program.courses.map((course) => (
                    <div key={course.id}>
                      <p className="text-sm font-medium">{course.name_en}</p>
                      {course.classes.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No classes tracked yet.</p>
                      ) : (
                        <ul className="mt-1 space-y-1.5">
                          {course.classes.map((item) => (
                            <li
                              key={item.id}
                              className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-elevated px-3 py-2 text-sm"
                            >
                              <span className="text-muted-foreground">#{item.class_no}</span>
                              <span className="flex-1 truncate">{item.title}</span>
                              <select
                                className="field w-32"
                                value={item.status}
                                onChange={async (event) => {
                                  await setClassStatus({
                                    data: {
                                      classId: item.id,
                                      status: event.target.value as
                                        | "uploaded"
                                        | "pending"
                                        | "missing"
                                        | "scheduled",
                                    },
                                  });
                                  await queryClient.invalidateQueries({ queryKey: ["activity"] });
                                }}
                              >
                                {["uploaded", "pending", "scheduled", "missing"].map((status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>
                              <button
                                className="text-xs text-destructive"
                                onClick={async () => {
                                  await deleteClass({ data: { classId: item.id } });
                                  await queryClient.invalidateQueries({ queryKey: ["activity"] });
                                }}
                              >
                                Remove
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </Panel>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "Students" ? (
        <div className="space-y-4">
          <Panel>
            <SectionTitle
              title="Upload student CSV"
              hint="Header row: name, contact_number, student_code, email, stream"
            />
            <textarea
              className="field min-h-32"
              placeholder="name,contact_number,student_code,email,stream"
              value={csv}
              onChange={(event) => setCsv(event.target.value)}
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <input
                type="file"
                accept=".csv,text/csv"
                className="text-sm text-muted-foreground"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (file) setCsv(await file.text());
                }}
              />
              <button
                className="btn-primary"
                disabled={csv.trim().length < 3}
                onClick={async () => {
                  const result = await importStudents({ data: { csv } });
                  setImportResult(
                    `${result.detected} students detected · ${result.valid} valid · ${result.imported} imported${
                      result.invalid.length ? ` · issues: ${result.invalid.join("; ")}` : ""
                    }`,
                  );
                  await queryClient.invalidateQueries({ queryKey: ["students"] });
                }}
              >
                Import students
              </button>
            </div>
            {importResult ? <p className="mt-3 text-sm text-muted-foreground">{importResult}</p> : null}
          </Panel>

          <Panel>
            <SectionTitle title="Student database" hint={`${(students.data ?? []).length} students`} />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2">Name</th>
                    <th className="py-2">Contact</th>
                    <th className="py-2">Code</th>
                    <th className="py-2">Stream</th>
                    <th className="py-2">Added</th>
                  </tr>
                </thead>
                <tbody>
                  {(students.data ?? []).map((student) => (
                    <tr key={student.id} className="border-t border-border">
                      <td className="py-2">{student.name}</td>
                      <td className="py-2">{student.contact_number}</td>
                      <td className="py-2">{student.student_code ?? "—"}</td>
                      <td className="py-2">{student.stream ?? "—"}</td>
                      <td className="py-2 text-xs text-muted-foreground">
                        {formatDate(student.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      ) : null}

      {tab === "Notices" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel>
            <SectionTitle title="Publish a notice" />
            <input
              className="field"
              placeholder="Title"
              value={notice.title}
              onChange={(event) => setNotice({ ...notice, title: event.target.value })}
            />
            <textarea
              className="field mt-3 min-h-28"
              placeholder="Notice details"
              value={notice.body}
              onChange={(event) => setNotice({ ...notice, body: event.target.value })}
            />
            <button
              className="btn-primary mt-3"
              disabled={notice.title.length < 3 || notice.body.length < 3}
              onClick={async () => {
                await createNotice({ data: notice });
                setNotice({ title: "", body: "" });
                await queryClient.invalidateQueries({ queryKey: ["notices"] });
              }}
            >
              Publish notice
            </button>
          </Panel>
          <Panel>
            <SectionTitle title="Published notices" />
            <div className="space-y-3">
              {(notices.data ?? []).map((item) => (
                <div key={item.id} className="rounded-xl border border-border bg-elevated p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{item.title}</p>
                    <StatusChip status={item.published ? "uploaded" : "pending"} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      ) : null}
    </AppShell>
  );
}
