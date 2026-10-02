const BASE = "https://api.10minuteschool.com/discovery-service/api/v1/products";

const HEADERS = {
  accept: "application/json",
  "X-Platform": "web",
  "User-Agent": "Mozilla/5.0 (compatible; HSC28SupportHub/1.0)",
};

export type TenmsSnapshot = {
  productId: number;
  slug: string;
  title: string;
  cta: string | null;
  startAt: string | null;
  availability: string | null;
  thumbnail: string | null;
  instructors: { name: string; image: string | null }[];
  checklist: string[];
  routineHtml: string | null;
  fetchedAt: string;
};

type RawSection = { type?: string; values?: unknown[] };

function pickThumbnail(media: unknown): string | null {
  if (!Array.isArray(media)) return null;
  const item = media.find((m) => {
    const entry = m as { resource_type?: string; resource_value?: string };
    return entry.resource_type === "image" && typeof entry.resource_value === "string";
  }) as { resource_value?: string } | undefined;
  return item?.resource_value ?? null;
}

/** Reads one HSC 28 course from 10 Minute School's public course feed. */
export async function fetchTenmsProduct(slug: string): Promise<TenmsSnapshot | null> {
  const response = await fetch(`${BASE}/${slug}?lang=en`, {
    headers: {
      ...HEADERS,
      ...(process.env["TENMS_BEARER_TOKEN"] ? { Authorization: `Bearer ${process.env["TENMS_BEARER_TOKEN"]}` } : {}),
    },
  });
  if (!response.ok) return null;

  const json = (await response.json()) as { data?: Record<string, unknown> };
  const data = json.data;
  if (!data) return null;

  const sections = (data["sections"] as RawSection[] | undefined) ?? [];
  const routine = sections.find((section) => section.type === "routine");
  const instructorSection = sections.find((section) => section.type === "instructors");

  return {
    productId: Number(data["id"] ?? 0),
    slug,
    title: String(data["title"] ?? slug),
    cta: (data["cta_text"] as { name?: string } | undefined)?.name ?? null,
    startAt: (data["start_at"] as string | undefined) ?? null,
    availability: (data["product_availability"] as string | undefined) ?? null,
    thumbnail: pickThumbnail(data["media"]),
    instructors: ((instructorSection?.values ?? []) as { name?: string; image?: string }[])
      .slice(0, 4)
      .map((item) => ({ name: String(item.name ?? ""), image: item.image ?? null })),
    checklist: ((data["checklist"] as { text?: string }[] | undefined) ?? [])
      .map((item) => String(item.text ?? ""))
      .filter(Boolean)
      .slice(0, 6),
    routineHtml: ((routine?.values ?? []) as { html?: string }[])[0]?.html ?? null,
    fetchedAt: new Date().toISOString(),
  };
}
