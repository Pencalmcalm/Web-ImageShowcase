import { database, bucket, requireView, HttpError, failure, type ImageRow } from "@/lib/archive-server";
export async function GET(request: Request, context: {params:Promise<{id:string}>}) {
  try {
    await requireView(request);
    const {id} = await context.params;
    const row = await database().prepare("SELECT * FROM archive_images WHERE id = ?").bind(id).first<ImageRow>();
    if (!row) throw new HttpError(404,"Image not found.");
    const url = new URL(request.url), key = url.searchParams.get("size") === "original" ? row.original_key : url.searchParams.get("size") === "thumbnail" ? row.thumbnail_key : row.display_key;
    const object = await bucket().get(key);
    if (!object) throw new HttpError(404,"Image file not found.");
    const headers = new Headers({ "Content-Type":object.httpMetadata?.contentType ?? "application/octet-stream", "Cache-Control":"private, no-store", "X-Content-Type-Options":"nosniff", "Content-Length":String(object.size) });
    if (url.searchParams.has("download")) headers.set("Content-Disposition",`attachment; filename="image-${row.id}"; filename*=UTF-8''${encodeURIComponent(row.original_name)}`);
    return new Response(object.body,{headers});
  } catch(error) { return failure(error); }
}
