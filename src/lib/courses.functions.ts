import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

import { readSession } from "./session.server";

export type ClassRow = {
  id: string;
  course_id: number;
  class_no: number;
  title: string;
  status: string;
  scheduled_on: string | null;
  resource_url: string | null;
  note: string | null;
  updated_at: string;
};

export type CourseRow = {
  id: number;
  name_en: string;
  classes: ClassRow[];
  uploaded: number;
  pending: number;
  missing: number;
  scheduled: number;
  total: number;
};

export type ProgramActivity = {
  id: number;
  catalog_product_id: number;
  slug: string | null;
  stream: string;
  subject_name_en: string;
  subject_name_bn: string;
  courses: CourseRow[];
  uploaded: number;
  pending: number;
  missing: number;
  scheduled: number;
  total: number;
  progress: number;
  lastUpload: string | null;
  live: {
    title: string;
    thumbnail: string | null;
    startAt: string | null;
    availability: string | null;
    instructors: { name: string; image: string | null }[];
    checklist: string[];
    fetchedAt: string;
  } | null;
};

function tally(classes: ClassRow[]) {
  const count = (status: string) => classes.filter((item) => item.status === status).length;
  return {
    uploaded: count("uploaded"),
    pending: count("pending"),
    missing: count("missing"),
    scheduled: count("scheduled"),
    total: classes.length,
  };
}

/** Public: every HSC 28 subject with its class upload status and cached 10ms info. */
export const getCourseActivity = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [{ data: programs }, { data: courses }, { data: classes }, { data: cache }] = await Promise.all([
    supabaseAdmin.from("tenms_programs").select("*").order("stream").order("subject_name_en"),
    supabaseAdmin.from("tenms_courses").select("*").order("id"),
    supabaseAdmin.from("tenms_classes").select("*").order("class_no"),
    supabaseAdmin.from("tenms_catalog_cache").select("*"),
  ]);

  const cacheByProduct = new Map((cache ?? []).map((row) => [row.product_id, row]));

  const result: ProgramActivity[] = (programs ?? []).map((program) => {
    const programCourses = (courses ?? []).filter((course) => course.program_id === program.id);
    const courseRows: CourseRow[] = programCourses.map((course) => {
      const courseClasses = ((classes ?? []) as ClassRow[]).filter((item) => item.course_id === course.id);
      return { id: course.id, name_en: course.name_en, classes: courseClasses, ...tally(courseClasses) };
    });

    const allClasses = courseRows.flatMap((course) => course.classes);
    const totals = tally(allClasses);
    const cached = cacheByProduct.get(program.catalog_product_id);
    const payload = (cached?.payload ?? null) as Record<string, unknown> | null;
    const lastUpload =
      allClasses
        .filter((item) => item.status === "uploaded")
        .map((item) => item.updated_at)
        .sort()
        .at(-1) ?? null;

    return {
      id: program.id,
      catalog_product_id: program.catalog_product_id,
      slug: program.slug,
      stream: program.stream,
      subject_name_en: program.subject_name_en,
      subject_name_bn: program.subject_name_bn,
      courses: courseRows,
      ...totals,
      progress: totals.total === 0 ? 0 : Math.round((totals.uploaded / totals.total) * 100),
      lastUpload,
      live: payload
        ? {
            title: String(payload["title"] ?? program.subject_name_en),
            thumbnail: (payload["thumbnail"] as string | null) ?? null,
            startAt: (payload["startAt"] as string | null) ?? null,
            availability: (payload["availability"] as string | null) ?? null,
            instructors:
              (payload["instructors"] as { name: string; image: string | null }[] | undefined) ?? [],
            checklist: (payload["checklist"] as string[] | undefined) ?? [],
            fetchedAt: String(cached?.fetched_at ?? payload["fetchedAt"] ?? ""),
          }
        : null,
    };
  });

  return result;
});

function requireStaff() {
  const session = readSession(getRequestHeader("cookie"));
  if (!session || session.role !== "staff") throw new Error("Support team access required.");
  return session;
}

/** Staff: refresh the cached 10 Minute School course info for every subject. */
export const syncTenmsCatalog = createServerFn({ method: "POST" }).handler(async () => {
  requireStaff();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { fetchTenmsProduct } = await import("./tenms.server");

  const { data: programs } = await supabaseAdmin
    .from("tenms_programs")
    .select("catalog_product_id, slug, subject_name_en");

  let synced = 0;
  const failed: string[] = [];

  for (const program of programs ?? []) {
    if (!program.slug) continue;
    try {
      const snapshot = await fetchTenmsProduct(program.slug);
      if (!snapshot) {
        failed.push(program.subject_name_en);
        continue;
      }
      await supabaseAdmin.from("tenms_catalog_cache").upsert({
        product_id: program.catalog_product_id,
        slug: program.slug,
        title: snapshot.title,
        payload: snapshot as unknown as Record<string, unknown>,
        fetched_at: new Date().toISOString(),
      });
      synced += 1;
    } catch {
      failed.push(program.subject_name_en);
    }
  }

  return { synced, failed };
});

/** Staff: add a class row to a course. */
export const addClass = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        courseId: z.number().int(),
        title: z.string().min(1).max(160),
        classNo: z.number().int().min(1).max(999),
        status: z.enum(["uploaded", "pending", "missing", "scheduled"]),
        scheduledOn: z.string().max(20).optional(),
        resourceUrl: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireStaff();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("tenms_classes").insert({
      course_id: data.courseId,
      title: data.title,
      class_no: data.classNo,
      status: data.status,
      scheduled_on: data.scheduledOn?.trim() ? data.scheduledOn : null,
      resource_url: data.resourceUrl?.trim() ? data.resourceUrl : null,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Staff: change a class upload status. */
export const setClassStatus = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        classId: z.string().uuid(),
        status: z.enum(["uploaded", "pending", "missing", "scheduled"]),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireStaff();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("tenms_classes")
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq("id", data.classId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Staff: delete a class row. */
export const deleteClass = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ classId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    requireStaff();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("tenms_classes").delete().eq("id", data.classId);
    return { ok: true as const };
  });

/** Public: flat course list for ticket forms. */
export const listCourses = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("tenms_courses")
    .select("id, name_en, program_id, tenms_programs(subject_name_en)")
    .order("program_id");
  return (data ?? []).map((row) => ({
    id: row.id,
    label: `${(row.tenms_programs as { subject_name_en?: string } | null)?.subject_name_en ?? ""} — ${row.name_en}`,
  }));
});
