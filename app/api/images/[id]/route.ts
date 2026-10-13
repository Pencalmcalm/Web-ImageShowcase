import { database, bucket, requireOwner, validateMetadata, publicImage, HttpError, failure, type ImageRow } from "@/lib/archive-server";
type Context = { params: Promise<{id:string}> };
export async function PATCH(request: Request, context: Context) {
  try {
    await requireOwner(request);
    const {id} = await context.params;
    if (!await database().prepare("SELECT id FROM archive_images WHERE id = ?").bind(id).first()) throw new HttpError(404,"This image is no longer in the archive.");
    const metadata = validateMetadata(await request.json() as Record<string,unknown>);
    await database().prepare("UPDATE archive_images SET title=?,caption=?,collection=?,chapter=?,date=? WHERE id=?").bind(metadata.title,metadata.caption,metadata.collection,metadata.chapter,metadata.date,id).run();
    return Response.json({ image: publicImage((await database().prepare("SELECT * FROM archive_images WHERE id=?").bind(id).first<ImageRow>())!) });
  } catch(error) { return failure(error); }
}
export async function DELETE(request: Request, context: Context) {
  try {
    await requireOwner(request);
    const {id} = await context.params;
    const row = await database().prepare("SELECT * FROM archive_images WHERE id = ?").bind(id).first<ImageRow>();
    if (!row) throw new HttpError(404,"This image is no longer in the archive.");
    await bucket().delete([row.original_key,row.display_key,row.thumbnail_key]);
    await database().prepare("DELETE FROM archive_images WHERE id=?").bind(id).run();
    return Response.json({ ok: true });
  } catch(error) { return failure(error); }
}
