export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export function supportedMedia(bytes: Uint8Array, mime: string): "image" | "video" | null {
  mime = mime.split(";")[0].trim().toLowerCase();
  const header = Buffer.from(bytes.slice(0, 32));
  if (mime === "image/jpeg" && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) return "image";
  if (mime === "image/png" && header.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return "image";
  if (mime === "image/gif" && /^GIF8[79]a/.test(header.toString("ascii"))) return "image";
  if (mime === "image/webp" && header.toString("ascii",0,4)==="RIFF" && header.toString("ascii",8,12)==="WEBP") return "image";
  if (["video/webm","audio/webm"].includes(mime) && header.subarray(0,4).equals(Buffer.from([26,69,223,163]))) return "video";
  if (["video/mp4","audio/mp4","audio/x-m4a"].includes(mime) && header.toString("ascii",4,8)==="ftyp") return "video";
  if (["audio/wav","audio/x-wav"].includes(mime) && header.toString("ascii",0,4)==="RIFF" && header.toString("ascii",8,12)==="WAVE") return "video";
  if (mime==="audio/ogg" && header.toString("ascii",0,4)==="OggS") return "video";
  if (mime==="audio/mpeg" && (header.toString("ascii",0,3)==="ID3" || (header[0]===255 && (header[1]&224)===224))) return "video";
  return null;
}
