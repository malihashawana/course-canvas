import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";

import {
  clearSessionCookie,
  readSession,
  serializeSession,
  type AppSession,
} from "./session.server";

const STAFF_USER = "TENMS";
const STAFF_PASS = "tenten10";

export const getSession = createServerFn({ method: "GET" }).handler(async () => {
  return readSession(getRequestHeader("cookie")) as AppSession | null;
});

export const studentLogin = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ contact: z.string().min(6).max(30) }).parse(input))
  .handler(async ({ data }) => {
    const contact = data.contact.replace(/[^0-9+]/g, "");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: student } = await supabaseAdmin
      .from("students")
      .select("id, name, contact_number, status")
      .eq("contact_number", contact)
      .maybeSingle();

    if (!student || student.status !== "active") {
      return {
        ok: false as const,
        message:
          "Your contact number was not found in the registered student list. Please contact the support team.",
      };
    }

    setResponseHeader(
      "set-cookie",
      serializeSession({
        role: "student",
        studentId: student.id,
        name: student.name,
        contact: student.contact_number,
      }),
    );
    return { ok: true as const, name: student.name };
  });

export const staffLogin = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ username: z.string().min(1).max(60), password: z.string().min(1).max(120) }).parse(input),
  )
  .handler(async ({ data }) => {
    if (data.username.trim() !== STAFF_USER || data.password !== STAFF_PASS) {
      return { ok: false as const, message: "Incorrect username or password." };
    }
    setResponseHeader("set-cookie", serializeSession({ role: "staff", name: "Support Team" }));
    return { ok: true as const };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  setResponseHeader("set-cookie", clearSessionCookie());
  return { ok: true as const };
});
