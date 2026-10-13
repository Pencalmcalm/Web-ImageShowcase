import { database, requireOwner, HttpError, failure } from "@/lib/archive-server";
export async function POST(request: Request) {
  try {
    await requireOwner(request);
    const {ids} = await request.json() as {ids?:unknown};
    if (!Array.isArray(ids) || !ids.length || ids.length > 5000 || ids.some(v => typeof v !== "string") || new Set(ids).size !== ids.length) throw new HttpError(400,"Provide a valid image order.");
    const rows = (await database().prepare("SELECT id FROM archive_images").all<{id:string}>()).results;
    if (ids.length !== rows.length || rows.some(row => !ids.includes(row.id))) throw new HttpError(409,"The archive changed. Refresh before reordering.");
    await database().batch(ids.map((id,index) => database().prepare("UPDATE archive_images SET position=? WHERE id=?").bind(index,id)));
    return Response.json({ ok:true });
  } catch(error) { return failure(error); }
}
