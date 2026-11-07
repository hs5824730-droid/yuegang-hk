// Metadata only, never a storage key or a filesystem path.
export function mediaOriginalFileName(value: string, latin1Multipart = false) {
 // Multer exposes UTF-8 multipart filename bytes as Latin-1; Workers already decodes them.
 if (latin1Multipart && [...value].every(char=>char.charCodeAt(0)<=255)) {
  try { value=new TextDecoder('utf-8',{fatal:true,ignoreBOM:false}).decode(Uint8Array.from(value,char=>char.charCodeAt(0))); } catch { /* Real Latin-1 names remain valid. */ }
 }
 return value.split(/[\\/]/).at(-1)!.replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0,160);
}
