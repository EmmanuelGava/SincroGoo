import { describe, expect, it } from 'vitest';
import { attachmentIconKind, extensionFromFileName, formatAttachmentSize } from '../fileKind';

describe('attachmentIconKind', () => {
  it('mapea mime de PDF a pdf', () => {
    expect(attachmentIconKind('application/pdf', 'informe.pdf')).toBe('pdf');
  });

  it('mapea Word a word', () => {
    expect(attachmentIconKind('application/msword', 'a.doc')).toBe('word');
    expect(
      attachmentIconKind(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'a.docx'
      )
    ).toBe('word');
  });

  it('mapea Excel a excel', () => {
    expect(attachmentIconKind('application/vnd.ms-excel', 'a.xls')).toBe('excel');
    expect(
      attachmentIconKind(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'a.xlsx'
      )
    ).toBe('excel');
  });

  it('cualquier otro mime es genérico', () => {
    expect(attachmentIconKind('application/zip', 'pack.zip')).toBe('generic');
    expect(attachmentIconKind(undefined, 'sin-ext')).toBe('generic');
  });
});

describe('extensionFromFileName', () => {
  it('devuelve la extensión en mayúsculas', () => {
    expect(extensionFromFileName('Informe.PDF')).toBe('PDF');
    expect(extensionFromFileName('a.docx')).toBe('DOCX');
  });
});

describe('formatAttachmentSize', () => {
  it('formatea megabytes con un decimal', () => {
    expect(formatAttachmentSize(1.2 * 1024 * 1024)).toBe('1.2 MB');
  });
});
