const HTTP_URL_RE = /https?:\/\/[^\s<>"']+/gi;

function trimTrailingPunctuation(url: string): string {
  return url.replace(/[.,;:!?)\]}>]+$/g, '');
}

export function extractFirstHttpUrl(text: string): string | null {
  const match = String(text || '').match(HTTP_URL_RE);
  if (!match?.[0]) return null;
  const url = trimTrailingPunctuation(match[0]);
  return url || null;
}

export function isUrlOnlyMessage(text: string, url: string): boolean {
  return String(text || '').trim() === url;
}

export type TextLinkPart =
  | { type: 'text'; value: string }
  | { type: 'link'; value: string };

export function splitTextWithLinks(text: string): TextLinkPart[] {
  const source = String(text || '');
  const parts: TextLinkPart[] = [];
  const re = new RegExp(HTTP_URL_RE.source, 'gi');
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    const raw = match[0];
    const url = trimTrailingPunctuation(raw);
    if (match.index > last) {
      parts.push({ type: 'text', value: source.slice(last, match.index) });
    }
    parts.push({ type: 'link', value: url });
    const trailing = raw.slice(url.length);
    last = match.index + raw.length;
    if (trailing) {
      parts.push({ type: 'text', value: trailing });
    }
  }
  if (last < source.length) {
    parts.push({ type: 'text', value: source.slice(last) });
  }
  return parts.length ? parts : [{ type: 'text', value: source }];
}
