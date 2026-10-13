import { defaults, database, requireOwner, passwordHash, HttpError, failure } from "@/lib/archive-server";
export async function PATCH(request: Request) {
  try {
    await requireOwner(request);
    const data = await request.json() as Record<string,unknown>, updates: [string,string][] = [];
    for (const key of Object.keys(defaults)) {
      if (key in data) {
        if (typeof data[key] !== "string" || (data[key] as string).length > 1000) throw new HttpError(400, "Archive text must be up to 1,000 characters.");
        if (["title","collectionA","collectionB"].includes(key) && !(data[key] as string).trim()) throw new HttpError(400, "Archive and collection names cannot be empty.");
        updates.push([key,(data[key] as string).trim()]);
      }
    }
    if ("password" in data) {
      if (typeof data.password !== "string" || (data.password && (data.password.length < 8 || data.password.length > 200)))
        throw new HttpError(400, "Use a password between 8 and 200 characters, or leave it empty to remove it.");
      const salt = crypto.randomUUID();
      updates.push(["password_salt", salt], ["password_hash", data.password ? await passwordHash(data.password, salt) : ""]);
    }
    if (updates.length) await database().batch(updates.map(([key,value]) => database().prepare("INSERT INTO archive_settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(key,value)));
    return Response.json({ ok: true });
  } catch(error) { return failure(error); }
}
