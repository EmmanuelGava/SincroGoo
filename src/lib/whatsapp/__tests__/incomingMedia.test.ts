import { describe, expect, it } from 'vitest';
import {
  classifyIncomingWaMedia,
  extensionForIncomingMedia,
  incomingMediaBucket,
  incomingFileFallbackMeta,
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

  it('clasifica documentMessage como file con fileName, nunca document', () => {
    const classified = classifyIncomingWaMedia({
      documentMessage: {
        fileName: 'presupuesto.xlsx',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        caption: 'acá va',
      },
    });
    expect(classified.kind).toBe('file');
    expect(classified.fileName).toBe('presupuesto.xlsx');
    expect(classified.caption).toBe('acá va');
  });
});

describe('extensionForIncomingMedia', () => {
  it('elige extensión según mime', () => {
    expect(extensionForIncomingMedia('image', 'image/png')).toBe('png');
    expect(extensionForIncomingMedia('audio', 'audio/ogg; codecs=opus')).toBe('ogg');
    expect(extensionForIncomingMedia('image', undefined)).toBe('jpg');
  });
});

describe('incomingMediaBucket', () => {
  it('sube documentos a chat-files, no a chat-images', () => {
    expect(incomingMediaBucket('file')).toBe('chat-files');
    expect(incomingMediaBucket('image')).toBe('chat-images');
    expect(incomingMediaBucket('audio')).toBe('chat-audio');
  });
});

describe('incomingFileFallbackMeta', () => {
  it('si falla la baja, igual arma metadata de nombre/mime sin file_url', () => {
    const meta = incomingFileFallbackMeta({
      kind: 'file',
      caption: null,
      fileName: 'contrato.pdf',
      mimetype: 'application/pdf',
      placeholder: '[Archivo]',
    });
    expect(meta).toEqual({
      file_type: 'file',
      file_name: 'contrato.pdf',
      mime_type: 'application/pdf',
    });
    expect(meta).not.toHaveProperty('file_url');
  });
});
