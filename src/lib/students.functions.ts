import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

import { readSession } from "./session.server";

function requireStaff() {
  const current = readSession(getRequestHeader("cookie"));
  if (!current || current.role !== "staff") throw new Error("Support team access required.");
  return current;
}

export const listStudents = createServerFn({ method: "GET" }).handler(async () => {
  requireStaff();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("students")
    .select("id, name, contact_number, student_code, email, stream, status, created_at")
    .order("created_at", { ascending: false })
    .limit(1000);
  return data ?? [];
});

/**
 * Staff: import students from a pasted CSV.
 * Header: name, contact_number, student_code, email, stream
 */
export const importStudents = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ csv: z.string().min(3).max(500_000) }).parse(input))
  .handler(async ({ data }) => {
    requireStaff();
    const lines = data.csv
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length < 2) return { detected: 0, valid: 0, imported: 0, invalid: ["No data rows found."] };

    const header = lines[0]!.split(",").map((cell) => cell.trim().toLowerCase());
    const index = (name: string) => header.indexOf(name);
    const nameAt = index("name");
    const contactAt = index("contact_number") >= 0 ? index("contact_number") : index("contact");
    if (nameAt < 0 || contactAt < 0) {
      return {
        detected: lines.length - 1,
        valid: 0,
        imported: 0,
        invalid: ["CSV needs at least a 'name' and 'contact_number' column."],
      };
    }

    const rows: Record<string, string | null>[] = [];
    const invalid: string[] = [];

    lines.slice(1).forEach((line, rowIndex) => {
      const cells = line.split(",").map((cell) => cell.trim());
      const name = cells[nameAt] ?? "";
      const contact = (cells[contactAt] ?? "").replace(/[^0-9+]/g, "");
      if (!name || contact.length < 6) {
        invalid.push(`Row ${rowIndex + 2}: missing name or valid contact number`);
        return;
      }
      rows.push({
        name,
        contact_number: contact,
        student_code: index("student_code") >= 0 ? (cells[index("student_code")] ?? null) : null,
        email: index("email") >= 0 ? (cells[index("email")] ?? null) : null,
        stream: index("stream") >= 0 ? (cells[index("stream")] ?? null) : null,
      });
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let imported = 0;
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200);
      const { error } = await supabaseAdmin
        .from("students")
        .upsert(chunk, { onConflict: "contact_number" });
      if (error) invalid.push(error.message);
      else imported += chunk.length;
    }

    return { detected: lines.length - 1, valid: rows.length, imported, invalid: invalid.slice(0, 12) };
  });

export const listNotices = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("notices")
    .select("id, title, body, published, created_at")
    .order("created_at", { ascending: false });
  return data ?? [];
});

export const createNotice = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ title: z.string().min(3).max(160), body: z.string().min(3).max(2000) }).parse(input),
  )
  .handler(async ({ data }) => {
    requireStaff();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("notices").insert({ title: data.title, body: data.body });
    return { ok: true as const };
  });
