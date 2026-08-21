import { describe, expect, it } from 'vitest';
import {
  classifyIncomingWaMedia,
  extensionForIncomingMedia,
} from '../incomingMedia';

describe('classifyIncomingWaMedia', () => {
  it('detecta imagen con caption y no la trata como texto', () => {
    const classified = classifyIncomingWaMedia({
      imageMessage: { caption: 'mira esto', mimetype: 'image/jpeg' },
    });
    expect(classified.kind).toBe('image');
    expect(classified.caption).toBe('mira esto');
    expect(classified.placeholder).toBe('[Imagen]');
  });

  it('detecta audio / nota de voz', () => {
    const classified = classifyIncomingWaMedia({
      audioMessage: { mimetype: 'audio/ogg; codecs=opus', seconds: 4, ptt: true },
    });
    expect(classified.kind).toBe('audio');
    expect(classified.duration).toBe(4);
    expect(classified.placeholder).toBe('[Audio]');
  });

  it('desenvuelve ephemeral y stickers', () => {
    const classified = classifyIncomingWaMedia({
      ephemeralMessage: { message: { stickerMessage: { mimetype: 'image/webp' } } },
    });
    expect(classified.kind).toBe('image');
    expect(classified.mimetype).toBe('image/webp');
  });

  it('deja el texto plano sin kind de media', () => {
    expect(classifyIncomingWaMedia({ conversation: 'hola' }).kind).toBeNull();
    expect(classifyIncomingWaMedia({ conversation: 'hola' }).caption).toBe('hola');
  });
});

describe('extensionForIncomingMedia', () => {
  it('elige extensión según mime', () => {
    expect(extensionForIncomingMedia('image', 'image/png')).toBe('png');
    expect(extensionForIncomingMedia('audio', 'audio/ogg; codecs=opus')).toBe('ogg');
    expect(extensionForIncomingMedia('image', undefined)).toBe('jpg');
  });
});
