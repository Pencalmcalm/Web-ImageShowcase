import { env } from "cloudflare:workers";

export type ImageRow = {
  id: string; title: string; caption: string; collection: string; chapter: string;
  date: string; position: number; original_key: string; display_key: string;
  thumbnail_key: string; original_name: string; width: number; height: number;
  bytes: number; created_at: string;
};
export const defaults = {
  title: "Image archive", subtitle: "A collection of images, arranged in time.",
  collectionA: "Collection A", collectionB: "Collection B",
  descriptionA: "A place for the first thread. Images, studies, and things worth keeping.",
  descriptionB: "Another point of view. A second thread, with its own rhythm.",
};
export function database() {
  if (!env.DB) throw new Error("Image database is unavailable.");
  return env.DB;
}
export function bucket() {
  if (!env.BUCKET) throw new Error("Image storage is unavailable.");
  return env.BUCKET;
}
export async function readSettings(): Promise<Record<string, string>> {
  const result = await database().prepare("SELECT key, value FROM archive_settings").all<{ key: string; value: string }>();
  return Object.fromEntries(result.results.map(row => [row.key, row.value]));
}
export async function identify(request: Request, allowSetup = false) {
  const id = request.headers.get("oai-authenticated-user-id");
  if (id && allowSetup) {
    // Enrollment occurs while this new Site is owner-private. The saved owner
    // ID protects management routes if the Site is shared later.
    await database().prepare("INSERT OR IGNORE INTO archive_settings (key, value) VALUES ('owner', ?)").bind(id).run();
  }
  const owner = await database().prepare("SELECT value FROM archive_settings WHERE key = 'owner'").first<{ value: string }>();
  return { isOwner: Boolean(id && owner?.value === id), signedIn: Boolean(id) };
}
export async function requireOwner(request: Request) {
  if (!(await identify(request)).isOwner) throw new HttpError(403, "Sign in as the archive owner to make changes.");
  requireSameOrigin(request);
}
export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site")
    throw new HttpError(403, "This action must be made from the archive.");
}
export async function hash(value: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))))
    .map(n => n.toString(16).padStart(2, "0")).join("");
}
export async function passwordHash(password: string, salt: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  return Array.from(new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: 100000, hash: "SHA-256" }, key, 256)))
    .map(n => n.toString(16).padStart(2, "0")).join("");
}
export async function requireView(request: Request, data?: Record<string,string>) {
  const settings = data ?? await readSettings();
  if (!settings.password_hash || (await identify(request)).isOwner) return;
  const expected = await hash(settings.password_hash + ":archive-session:" + settings.password_salt);
  const cookie = request.headers.get("cookie")?.split(";").map(v => v.trim()).find(v => v.startsWith("archive_access="))?.slice(15);
  if (!cookie || cookie !== expected) throw new HttpError(401, "Enter the archive password to view images.");
}
export function publicImage(row: ImageRow) {
  return { id: row.id, title: row.title, caption: row.caption, collection: row.collection, chapter: row.chapter,
    date: row.date, position: row.position, originalName: row.original_name, width: row.width, height: row.height,
    bytes: row.bytes, createdAt: row.created_at, src: `/api/images/${row.id}/file?size=display`,
    thumbnail: `/api/images/${row.id}/file?size=thumbnail`, original: `/api/images/${row.id}/file?size=original&download=1` };
}
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function failure(error: unknown) {
  if (error instanceof HttpError) return Response.json({ error: error.message }, { status: error.status });
  console.error("Archive request failed", error);
  return Response.json({ error: "The archive could not complete this action. Please try again." }, { status: 500 });
}
export function validateMetadata(data: Record<string, unknown>) {
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const caption = typeof data.caption === "string" ? data.caption.trim() : "";
  const chapter = typeof data.chapter === "string" ? data.chapter.trim() : "";
  const collection = data.collection, date = data.date;
  if (!title || title.length > 180) throw new HttpError(400, "Give the image a title of up to 180 characters.");
  if (caption.length > 3000 || !chapter || chapter.length > 80) throw new HttpError(400, "Use a chapter name up to 80 characters and a caption up to 3,000.");
  if (collection !== "A" && collection !== "B") throw new HttpError(400, "Choose collection A or B.");
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date + "T12:00:00Z")) || new Date(date+"T12:00:00Z").toISOString().slice(0,10) !== date)
    throw new HttpError(400, "Choose a valid image date.");
  return { title, caption, chapter, collection, date };
}
