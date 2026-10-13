import { database, hash, passwordHash, readSettings, requireSameOrigin, HttpError, failure } from "@/lib/archive-server";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const settings = await readSettings();
    if (!settings.password_hash) return Response.json({ ok: true });
    const key = "attempt:" + await hash(request.headers.get("cf-connecting-ip") ?? "local");
    const row = await database().prepare("SELECT value FROM archive_settings WHERE key = ?").bind(key).first<{value:string}>();
    const saved = row ? JSON.parse(row.value) : { time: 0, count: 0 };
    const attempt = Date.now() - saved.time < 900000 ? saved : { time: Date.now(), count: 0 };
    if (attempt.count >= 8) throw new HttpError(429, "Too many attempts. Please try again in 15 minutes.");
    attempt.count++;
    await database().prepare("INSERT INTO archive_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(key,JSON.stringify(attempt)).run();
    const data = await request.json() as {password?:string};
    if (typeof data.password !== "string" || data.password.length > 200 || await passwordHash(data.password, settings.password_salt) !== settings.password_hash)
      throw new HttpError(401, "That password did not match. Please try again.");
    await database().prepare("DELETE FROM archive_settings WHERE key = ?").bind(key).run();
    const token = await hash(settings.password_hash + ":archive-session:" + settings.password_salt);
    return Response.json({ ok: true }, { headers: { "Set-Cookie": `archive_access=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${new URL(request.url).protocol === "https:" ? "; Secure" : ""}` } });
  } catch(error) { return failure(error); }
}
