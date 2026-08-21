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
  });

  it('imagen y audio no cambian: se renderizan como media, no como documento', () => {
    expect(messageBubbleView({
      contenido: '[Imagen]',
      metadata: { file_type: 'image', file_url: 'https://x/img.jpg' },
    })).toMatchObject({ showImage: true, showAudio: false, filePresentation: null });

    expect(messageBubbleView({
      contenido: '[Audio]',
      metadata: { file_type: 'audio', file_url: 'https://x/a.ogg' },
    })).toMatchObject({ showImage: false, showAudio: true, filePresentation: null });
  });
});
