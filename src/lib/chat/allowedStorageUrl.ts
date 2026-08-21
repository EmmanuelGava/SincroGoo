const ALLOWED_BUCKETS = ['chat-files', 'chat-images', 'chat-audio'] as const;

export function isAllowedStorageUrl(raw: string, supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''): boolean {
  try {
    const parsed = new URL(raw);
    const supabase = new URL(supabaseUrl);
    if (parsed.protocol !== 'https:') return false;
    if (parsed.host !== supabase.host) return false;
    const path = parsed.pathname;
    return ALLOWED_BUCKETS.some((bucket) => path.startsWith(`/storage/v1/object/public/${bucket}/`));
  } catch {
    return false;
  }
}
