import { describe, expect, it } from 'vitest';
import { isAllowedStorageUrl } from '../allowedStorageUrl';

const SUPABASE = 'https://abcd.supabase.co';

describe('isAllowedStorageUrl', () => {
  it('acepta chat-files, chat-images y chat-audio del host de Supabase', () => {
    expect(isAllowedStorageUrl(
      `${SUPABASE}/storage/v1/object/public/chat-files/user/in/a.pdf`,
      SUPABASE
    )).toBe(true);
    expect(isAllowedStorageUrl(
      `${SUPABASE}/storage/v1/object/public/chat-images/user/in/a.jpg`,
      SUPABASE
    )).toBe(true);
    expect(isAllowedStorageUrl(
      `${SUPABASE}/storage/v1/object/public/chat-audio/user/in/a.ogg`,
      SUPABASE
    )).toBe(true);
  });

  it('rechaza un host ajeno aunque el path sea de storage', () => {
    expect(isAllowedStorageUrl(
      'https://evil.example/storage/v1/object/public/chat-files/x.pdf',
      SUPABASE
    )).toBe(false);
  });

  it('rechaza otro bucket del mismo host', () => {
    expect(isAllowedStorageUrl(
      `${SUPABASE}/storage/v1/object/public/avatars/x.png`,
      SUPABASE
    )).toBe(false);
  });
});
