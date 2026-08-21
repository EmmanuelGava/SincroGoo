export type ParsedOg = {
  title: string;
  description: string;
  image: string | null;
  siteName: string;
};

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function metaContent(html: string, property: string): string | null {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`<meta\\b[^>]*\\b(?:property|name)=["']${escaped}["'][^>]*\\bcontent=["']([^"']*)["'][^>]*>`, 'i'),
    new RegExp(`<meta\\b[^>]*\\bcontent=["']([^"']*)["'][^>]*\\b(?:property|name)=["']${escaped}["'][^>]*>`, 'i'),
  ];
  for (const re of patterns) {
    const match = html.match(re);
    if (match?.[1]) return decodeEntities(match[1].trim());
  }
  return null;
}

function documentTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = match?.[1]?.trim();
  return title ? decodeEntities(title) : null;
}

export function parseOgHtml(html: string, fallbackHostname: string): ParsedOg {
  const title = metaContent(html, 'og:title') || documentTitle(html) || fallbackHostname;
  const description = metaContent(html, 'og:description') || '';
  const image = metaContent(html, 'og:image');
  const siteName = metaContent(html, 'og:site_name') || fallbackHostname;
  return {
    title,
    description,
    image: image || null,
    siteName,
  };
}
