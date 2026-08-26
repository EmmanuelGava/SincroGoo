import { describe, expect, it } from 'vitest';
import { outgoingMediaHint, validateOutgoingMedia } from '../mediaLimits';

function file(partial: { type: string; size: number; name?: string }) {
  return partial;
}

describe('validateOutgoingMedia', () => {
  it('rechaza una imagen de más de 5 MB', () => {
    const result = validateOutgoingMedia(file({
      type: 'image/png',
      size: 6 * 1024 * 1024,
      name: 'foto.png',
    }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('La imagen no puede superar 5 MB');
    }
  });

  it('acepta PNG dentro del límite', () => {
    const result = validateOutgoingMedia(file({ type: 'image/png', size: 800_000, name: 'ok.png' }));
    expect(result).toEqual({ ok: true, kind: 'image' });
  });

  it('acepta video MP4 dentro de 16 MB', () => {
    const result = validateOutgoingMedia(file({ type: 'video/mp4', size: 1000, name: 'clip.mp4' }));
    expect(result).toEqual({ ok: true, kind: 'video' });
  });

  it('rechaza video que no sea MP4', () => {
    const result = validateOutgoingMedia(file({ type: 'video/webm', size: 1000, name: 'clip.webm' }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/MP4/i);
    }
  });

  it('rechaza video de más de 16 MB', () => {
    const result = validateOutgoingMedia(file({ type: 'video/mp4', size: 17 * 1024 * 1024, name: 'clip.mp4' }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/16 MB/);
    }
  });

  it('acepta image/jpg como jpeg', () => {
    const result = validateOutgoingMedia(file({ type: 'image/jpg', size: 1000, name: 'foto.jpg' }));
    expect(result).toEqual({ ok: true, kind: 'image' });
  });

  it('rechaza audio de más de 16 MB', () => {
    const result = validateOutgoingMedia(file({
      type: 'audio/webm',
      size: 17 * 1024 * 1024,
      name: 'nota.webm',
    }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Audio máximo 16 MB');
    }
  });

  it('acepta PDF dentro de 16 MB como file', () => {
    const result = validateOutgoingMedia(file({
      type: 'application/pdf',
      size: 2 * 1024 * 1024,
      name: 'doc.pdf',
    }));
    expect(result).toEqual({ ok: true, kind: 'file' });
  });

  it('acepta Word, Excel y PowerPoint', () => {
    expect(validateOutgoingMedia(file({
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 1000,
      name: 'a.docx',
    }))).toEqual({ ok: true, kind: 'file' });
    expect(validateOutgoingMedia(file({
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: 1000,
      name: 'a.xlsx',
    }))).toEqual({ ok: true, kind: 'file' });
    expect(validateOutgoingMedia(file({
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      size: 1000,
      name: 'a.pptx',
    }))).toEqual({ ok: true, kind: 'file' });
  });

  it('rechaza un documento de más de 16 MB', () => {
    const result = validateOutgoingMedia(file({
      type: 'application/pdf',
      size: 17 * 1024 * 1024,
      name: 'grande.pdf',
    }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/16 MB/);
    }
  });

  it('expone los límites en un texto para la UI', () => {
    expect(outgoingMediaHint()).toMatch(/5 MB/);
    expect(outgoingMediaHint()).toMatch(/16 MB/);
    expect(outgoingMediaHint()).not.toMatch(/sin video/i);
  });
});
