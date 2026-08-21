import { describe, expect, it } from 'vitest';
import { incomingLiteFileMetadata } from '../incomingLiteMetadata';

describe('incomingLiteFileMetadata', () => {
  it('incluye file_name y mime aunque no haya file_url', () => {
    expect(incomingLiteFileMetadata({
      file_name: 'contrato.pdf',
      file_type: 'file',
      mimetype: 'application/pdf',
    })).toEqual({
      file_type: 'file',
      file_name: 'contrato.pdf',
      mime_type: 'application/pdf',
    });
  });

  it('incluye file_url y file_size cuando existen', () => {
    expect(incomingLiteFileMetadata({
      file_url: 'https://x/a.pdf',
      file_type: 'file',
      file_name: 'a.pdf',
      file_size: 1200,
      mimetype: 'application/pdf',
    })).toMatchObject({
      file_url: 'https://x/a.pdf',
      file_size: 1200,
    });
  });

  it('no agrega metadata de archivo en un texto plano', () => {
    expect(incomingLiteFileMetadata({ type: 'text', message: 'hola' })).toBeNull();
  });
});
