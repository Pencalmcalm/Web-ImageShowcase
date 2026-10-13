import { defaults, identify, readSettings, database, requireView, publicImage, failure, type ImageRow } from "@/lib/archive-server";
export async function GET(request: Request) {
  try {
    const identity = await identify(request, true), settings = await readSettings();
    let locked = false;
    try { await requireView(request, settings); } catch { locked = true; }
    const rows = locked ? [] : (await database().prepare("SELECT * FROM archive_images ORDER BY date DESC, chapter, position, created_at").all<ImageRow>()).results;
    return Response.json({ settings: { ...defaults, ...Object.fromEntries(Object.keys(defaults).filter(k => k in settings).map(k => [k,settings[k]])) },
      images: rows.map(publicImage), isOwner: identity.isOwner, signedIn: identity.signedIn, passwordEnabled: Boolean(settings.password_hash), locked },
      { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error); }
}
