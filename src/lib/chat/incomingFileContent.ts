export function incomingMediaBodyText(input: {
  caption?: string | null;
  fileName?: string | null;
  placeholder: string;
}): string {
  const caption = String(input.caption || '').trim();
  if (caption) return caption;
  const fileName = String(input.fileName || '').trim();
  if (fileName) return fileName;
  return input.placeholder;
}
