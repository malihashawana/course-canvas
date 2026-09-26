import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

import { readSession, type AppSession } from "./session.server";

export const TICKET_CATEGORIES = [
  "Sound",
  "Video",
  "Exam",
  "Recorded Lecture",
  "Live Class",
  "App / Website",
  "Payment / Subscription",
  "Study Material",
  "Account / Login",
  "Other",
] as const;

export const TICKET_STATUSES = ["open", "in_review", "waiting_info", "resolved", "closed"] as const;

function session(): AppSession | null {
  return readSession(getRequestHeader("cookie"));
}

function requireStudent() {
  const current = session();
  if (!current || current.role !== "student") throw new Error("Please log in again.");
  return current;
}

function requireStaff() {
  const current = session();
  if (!current || current.role !== "staff") throw new Error("Support team access required.");
  return current;
}

export const createTicket = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        category: z.enum(TICKET_CATEGORIES),
        title: z.string().min(4).max(160),
        description: z.string().min(10).max(4000),
        courseId: z.number().int().nullable().optional(),
        classRef: z.string().max(160).optional(),
        attachmentUrl: z.string().max(600).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const student = requireStudent();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: ticket, error } = await supabaseAdmin
      .from("tickets")
      .insert({
        student_id: student.studentId,
        category: data.category,
        title: data.title,
        description: data.description,
        course_id: data.courseId ?? null,
        class_ref: data.classRef?.trim() ? data.classRef : null,
        attachment_url: data.attachmentUrl?.trim() ? data.attachmentUrl : null,
      })
      .select("id, ticket_no, status, category, created_at")
      .single();
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("ticket_messages").insert({
      ticket_id: ticket.id,
      author_type: "student",
      author_name: student.name,
      body: data.description,
    });

    return ticket;
  });

export const myTickets = createServerFn({ method: "GET" }).handler(async () => {
  const student = requireStudent();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("tickets")
    .select("id, ticket_no, title, category, status, created_at, updated_at")
    .eq("student_id", student.studentId)
    .order("created_at", { ascending: false });
  return data ?? [];
});

export const ticketThread = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ ticketId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const current = session();
    if (!current) throw new Error("Please log in again.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const query = supabaseAdmin
      .from("tickets")
      .select(
        "id, ticket_no, title, category, status, description, class_ref, attachment_url, created_at, students(name, contact_number)",
      )
      .eq("id", data.ticketId);

    const { data: ticket } = await (current.role === "student"
      ? query.eq("student_id", current.studentId)
      : query
    ).maybeSingle();
    if (!ticket) throw new Error("Ticket not found.");

    const { data: messages } = await supabaseAdmin
      .from("ticket_messages")
      .select("id, author_type, author_name, body, created_at")
      .eq("ticket_id", data.ticketId)
      .order("created_at");

    const student = ticket.students as { name?: string; contact_number?: string } | null;
    return {
      ...ticket,
      students: undefined,
      studentName: student?.name ?? "Student",
      studentContact: current.role === "staff" ? (student?.contact_number ?? null) : null,
      messages: messages ?? [],
    };
  });

export const replyToTicket = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ ticketId: z.string().uuid(), body: z.string().min(1).max(3000) }).parse(input),
  )
  .handler(async ({ data }) => {
    const current = session();
    if (!current) throw new Error("Please log in again.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (current.role === "student") {
      const { data: owned } = await supabaseAdmin
        .from("tickets")
        .select("id")
        .eq("id", data.ticketId)
        .eq("student_id", current.studentId)
        .maybeSingle();
      if (!owned) throw new Error("Ticket not found.");
    }

    await supabaseAdmin.from("ticket_messages").insert({
      ticket_id: data.ticketId,
      author_type: current.role,
      author_name: current.role === "staff" ? "Support Team" : current.name,
      body: data.body,
    });
    await supabaseAdmin
      .from("tickets")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", data.ticketId);

    return { ok: true as const };
  });

export const publicTickets = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("tickets")
    .select("id, ticket_no, title, category, status, description, created_at")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(60);
  return data ?? [];
});

export const staffTickets = createServerFn({ method: "GET" }).handler(async () => {
  requireStaff();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("tickets")
    .select(
      "id, ticket_no, title, category, status, class_ref, attachment_url, created_at, updated_at, course_id, students(name, contact_number)",
    )
    .order("created_at", { ascending: false });
  return (data ?? []).map((row) => {
    const student = row.students as { name?: string; contact_number?: string } | null;
    return {
      ...row,
      students: undefined,
      studentName: student?.name ?? "",
      studentContact: student?.contact_number ?? "",
    };
  });
});

export const setTicketStatus = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ ticketId: z.string().uuid(), status: z.enum(TICKET_STATUSES) }).parse(input),
  )
  .handler(async ({ data }) => {
    requireStaff();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("tickets")
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq("id", data.ticketId);
    return { ok: true as const };
  });
