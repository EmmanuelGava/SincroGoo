import { describe, expect, it } from 'vitest';
import { extractHistoryBody } from '../historyCatchup';

describe('extractHistoryBody', () => {
  it('persiste el fileName del documentMessage y no usa [Archivo] si hay nombre', () => {
    const body = extractHistoryBody({
      documentMessage: { fileName: 'factura.pdf', mimetype: 'application/pdf' },
    });
    expect(body?.type).toBe('file');
    expect(body?.text).toBe('factura.pdf');
    expect(body?.fileName).toBe('factura.pdf');
    expect(body?.mimetype).toBe('application/pdf');
  });
});
