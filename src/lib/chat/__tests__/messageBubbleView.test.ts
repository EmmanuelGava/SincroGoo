import { describe, expect, it } from 'vitest';
import { messageBubbleView } from '../messageBubbleView';

describe('messageBubbleView', () => {
  it('URL sola: tarjeta de preview, sin duplicar el texto crudo', () => {
    const view = messageBubbleView({
      contenido: 'https://example.com/nota',
      metadata: {},
    });
    expect(view.showRawText).toBe(false);
    expect(view.previewUrl).toBe('https://example.com/nota');
    expect(view.filePresentation).toBeNull();
  });

  it('URL + texto: muestra ambos', () => {
    const view = messageBubbleView({
      contenido: 'mirá esto https://example.com/nota',
      metadata: {},
    });
    expect(view.showRawText).toBe(true);
    expect(view.previewUrl).toBe('https://example.com/nota');
  });

  it('documento con file_url: tarjeta', () => {
    const view = messageBubbleView({
      contenido: 'contrato.pdf',
      metadata: {
        file_type: 'file',
        file_url: 'https://abcd.supabase.co/storage/v1/object/public/chat-files/a.pdf',
        file_name: 'contrato.pdf',
      },
    });
    expect(view.filePresentation).toBe('card');
    expect(view.showImage).toBe(false);
    expect(view.showAudio).toBe(false);
    expect(view.showRawText).toBe(false);
  });

  it('documento sin file_url: chip no disponible', () => {
    const view = messageBubbleView({
      contenido: 'contrato.pdf',
      metadata: {
        file_type: 'file',
        file_name: 'contrato.pdf',
      },
    });
    expect(view.filePresentation).toBe('unavailable');
    expect(view.unavailableLabel).toBe('contrato.pdf');
  });

  it('imagen con file_url: media, sin texto [Imagen]', () => {
    const view = messageBubbleView({
      contenido: '[Imagen]',
      metadata: { file_type: 'image', file_url: 'https://x/img.jpg', file_name: 'image.jpg' },
    });
    expect(view).toMatchObject({
      showImage: true,
      showAudio: false,
      filePresentation: null,
      showRawText: false,
    });
  });

  it('audio con file_url: player, sin texto [Audio]', () => {
    const view = messageBubbleView({
      contenido: '[Audio]',
      metadata: { file_type: 'audio', file_url: 'https://x/a.ogg' },
    });
    expect(view).toMatchObject({
      showImage: false,
      showAudio: true,
      filePresentation: null,
      showRawText: false,
    });
  });

  it('video / archivo placeholder sin url: no muestra el corchete como texto', () => {
    expect(messageBubbleView({
      contenido: '[Video]',
      tipo: 'video',
      metadata: { file_type: 'video' },
    })).toMatchObject({
      showRawText: false,
      filePresentation: 'unavailable',
      unavailableLabel: 'Video',
    });

    expect(messageBubbleView({
      contenido: '[Archivo]',
      tipo: 'file',
      metadata: { file_type: 'file' },
    })).toMatchObject({
      showRawText: false,
      filePresentation: 'unavailable',
      unavailableLabel: 'Archivo',
    });
  });

  it('imagen sin file_url: no muestra [Imagen] crudo', () => {
    const view = messageBubbleView({
      contenido: '[Imagen]',
      tipo: 'image',
      metadata: { file_type: 'image', mime_type: 'image/jpeg' },
    });
    expect(view.showRawText).toBe(false);
    expect(view.showImage).toBe(false);
    expect(view.filePresentation).toBe('unavailable');
    expect(view.unavailableLabel).toBe('Imagen');
  });

  it('caption real de imagen se muestra junto a la foto', () => {
    const view = messageBubbleView({
      contenido: 'Mirà esta colchoneta',
      metadata: { file_type: 'image', file_url: 'https://x/img.jpg' },
    });
    expect(view.showImage).toBe(true);
    expect(view.showRawText).toBe(true);
  });
});
