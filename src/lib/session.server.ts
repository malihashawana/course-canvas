import { createHmac, timingSafeEqual } from "crypto";

export type AppSession =
  | { role: "student"; studentId: string; name: string; contact: string }
  | { role: "staff"; name: string };

const COOKIE = "hsc28_session";
const MAX_AGE = 60 * 60 * 12;

function secret() {
  const value = process.env["SESSION_SECRET"];
  if (!value) throw new Error("SESSION_SECRET is not configured");
  return value;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function serializeSession(session: AppSession) {
  const payload = Buffer.from(JSON.stringify({ ...session, exp: Date.now() + MAX_AGE * 1000 })).toString(
    "base64url",
  );
  const value = `${payload}.${sign(payload)}`;
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${MAX_AGE}`;
}

export function clearSessionCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`;
}

export function readSession(cookieHeader: string | undefined | null): AppSession | null {
  if (!cookieHeader) return null;
  const raw = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);
  if (!raw) return null;

  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const provided = Buffer.from(signature);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AppSession & {
      exp: number;
    };
    if (!data.exp || data.exp < Date.now()) return null;
    const { exp: _exp, ...session } = data;
    return session as AppSession;
  } catch {
    return null;
  }
}
