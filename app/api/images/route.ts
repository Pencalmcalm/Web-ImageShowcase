import { database, bucket, requireOwner, validateMetadata, publicImage, HttpError, failure, type ImageRow } from "@/lib/archive-server";
async function validateFile(value: FormDataEntryValue | null, max: number) {
  if (!(value instanceof File) || !value.size || value.size > max) throw new HttpError(400, "Choose a JPG, PNG, WebP, or AVIF image under 25 MB.");
  const b = new Uint8Array(await value.slice(0,64).arrayBuffer()), s = new TextDecoder().decode(b);
  const type = b[0] === 255 && b[1] === 216 && b[2] === 255 ? "image/jpeg" :
    b[0] === 137 && s.slice(1,4) === "PNG" ? "image/png" :
    s.slice(0,4) === "RIFF" && s.slice(8,12) === "WEBP" ? "image/webp" :
    s.slice(4,8) === "ftyp" && /avif|avis/.test(s.slice(8,40)) ? "image/avif" : null;
  if (!type) throw new HttpError(400, "This file is not a supported image. Use JPG, PNG, WebP, or AVIF.");
  return { file: value, type };
}
export async function POST(request: Request) {
  const stored: string[] = [];
  try {
    await requireOwner(request);
    if (Number(request.headers.get("content-length") ?? 0) > 35 * 1024 * 1024) throw new HttpError(413, "This upload is too large.");
    const form = await request.formData();
    const metadata = validateMetadata(Object.fromEntries(["title","caption","collection","chapter","date"].map(k => [k,form.get(k)])));
    const original = await validateFile(form.get("original"),25*1024*1024);
    const display = await validateFile(form.get("display"),6*1024*1024), thumbnail = await validateFile(form.get("thumbnail"),2*1024*1024);
    const width = Number(form.get("width")), height = Number(form.get("height"));
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 50000 || height > 50000) throw new HttpError(400,"Invalid image dimensions.");
    const id = crypto.randomUUID(), originalKey = `images/${id}/original`, displayKey = `images/${id}/display`, thumbnailKey = `images/${id}/thumbnail`;
    for (const [key,upload] of [[originalKey,original],[displayKey,display],[thumbnailKey,thumbnail]] as const) {
      await bucket().put(key,upload.file.stream(),{httpMetadata:{contentType:upload.type}}); stored.push(key);
    }
    const max = await database().prepare("SELECT MAX(position) AS position FROM archive_images").first<{position:number|null}>();
    await database().prepare("INSERT INTO archive_images (id,title,caption,collection,chapter,date,position,original_key,display_key,thumbnail_key,original_name,width,height,bytes,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .bind(id,metadata.title,metadata.caption,metadata.collection,metadata.chapter,metadata.date,(max?.position??0)+1,originalKey,displayKey,thumbnailKey,original.file.name.slice(0,255),width,height,original.file.size,new Date().toISOString()).run();
    return Response.json({ image: publicImage((await database().prepare("SELECT * FROM archive_images WHERE id = ?").bind(id).first<ImageRow>())!) },{status:201});
  } catch(error) {
    if (stored.length) await bucket().delete(stored).catch(() => {});
    return failure(error);
  }
}
