import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { formatDate, Panel, ProgressRing, StatBar, StatusChip } from "@/components/ui-bits";
import { getCourseActivity } from "@/lib/courses.functions";
import { getSession } from "@/lib/auth.functions";

export const Route = createFileRoute("/activity")({
  head: () => ({
    meta: [
      { title: "HSC 28 Course Activity — upload status by subject" },
      {
        name: "description",
        content:
          "Live HSC 28 course board: class upload status, progress per subject and course info pulled from 10 Minute School.",
      },
      { property: "og:title", content: "HSC 28 Course Activity" },
      {
        property: "og:description",
        content: "Class upload status and progress for all 14 HSC 28 subjects.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ActivityPage,
});

const STREAMS = ["All", "Common", "Science", "Business Studies", "Humanities"];

function ActivityPage() {
  const activity = useQuery({ queryKey: ["activity"], queryFn: () => getCourseActivity({}) });
  const session = useQuery({ queryKey: ["session"], queryFn: () => getSession({}) });
  const [stream, setStream] = useState("All");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);

  const programs = activity.data ?? [];
  const filtered = useMemo(
    () =>
      programs.filter(
        (program) =>
          (stream === "All" || program.stream === stream) &&
          (search.trim() === "" ||
            `${program.subject_name_en} ${program.subject_name_bn}`
              .toLowerCase()
              .includes(search.trim().toLowerCase())),
      ),
    [programs, stream, search],
  );

  const nav =
    session.data?.role === "staff"
      ? [
          { to: "/staff", label: "Support desk" },
          { to: "/activity", label: "Course activity" },
        ]
      : session.data?.role === "student"
        ? [
            { to: "/student", label: "My dashboard" },
            { to: "/activity", label: "Course activity" },
          ]
        : [{ to: "/activity", label: "Course activity" }];

  return (
    <AppShell
      nav={nav}
      user={session.data ? { name: session.data.name } : null}
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">HSC 28 course activity</h1>
          <p className="text-sm text-muted-foreground">
            Upload status of every class, subject progress, and course info from 10 Minute School.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {STREAMS.map((item) => (
            <button
              key={item}
              onClick={() => setStream(item)}
              className={`chip transition-colors ${stream === item ? "border-primary/50 text-primary" : "text-muted-foreground"}`}
            >
              {item}
            </button>
          ))}
          <input
            className="field w-48"
            placeholder="Search subject"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      {activity.isLoading ? <p className="text-sm text-muted-foreground">Loading course board…</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((program) => {
          const open = openId === program.id;
          return (
            <Panel key={program.id} className="panel-hover">
              <div className="flex items-start gap-4">
                {program.live?.thumbnail ? (
                  <img
                    src={program.live.thumbnail}
                    alt={program.subject_name_en}
                    className="size-16 rounded-xl border border-border object-cover"
                  />
                ) : (
                  <div className="grid size-16 place-items-center rounded-xl border border-border bg-elevated font-display text-lg">
                    {program.subject_name_en.slice(0, 2)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate font-display text-lg font-semibold">
                      {program.subject_name_en}
                    </h2>
                    <span className="chip text-muted-foreground">{program.stream}</span>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">{program.subject_name_bn}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Last upload: {formatDate(program.lastUpload)}
                  </p>
                </div>
                <ProgressRing value={program.progress} />
              </div>

              <div className="mt-4">
                <StatBar
                  uploaded={program.uploaded}
                  pending={program.pending}
                  scheduled={program.scheduled}
                  missing={program.missing}
                />
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="chip text-success">{program.uploaded} uploaded</span>
                  <span className="chip text-info">{program.scheduled} scheduled</span>
                  <span className="chip text-warning">{program.pending} pending</span>
                  <span className="chip text-destructive">{program.missing} missing</span>
                </div>
              </div>

              {program.live ? (
                <div className="mt-4 rounded-xl border border-border bg-elevated p-3 text-sm">
                  <p className="font-medium">{program.live.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {program.live.availability ? `${program.live.availability} · ` : ""}
                    Course info synced {formatDate(program.live.fetchedAt)}
                  </p>
                  {program.live.instructors.length > 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Instructors: {program.live.instructors.map((item) => item.name).join(", ")}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-4 text-xs text-muted-foreground">
                  Course info not synced yet — the support team can sync it from the support desk.
                </p>
              )}

              <button
                className="btn-ghost mt-4 w-full text-sm"
                onClick={() => setOpenId(open ? null : program.id)}
              >
                {open ? "Hide classes" : `Show classes (${program.courses.length} courses)`}
              </button>

              {open ? (
                <div className="mt-4 space-y-4">
                  {program.courses.map((course) => (
                    <div key={course.id}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-medium">{course.name_en}</span>
                        <span className="text-xs text-muted-foreground">
                          {course.uploaded}/{course.total} uploaded
                        </span>
                      </div>
                      {course.classes.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No classes tracked yet.</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {course.classes.map((item) => (
                            <li
                              key={item.id}
                              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-elevated px-3 py-2 text-sm"
                            >
                              <span className="min-w-0">
                                <span className="text-muted-foreground">#{item.class_no}</span>{" "}
                                <span className="truncate">{item.title}</span>
                              </span>
                              <StatusChip status={item.status} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </Panel>
          );
        })}
      </div>
    </AppShell>
  );
}
