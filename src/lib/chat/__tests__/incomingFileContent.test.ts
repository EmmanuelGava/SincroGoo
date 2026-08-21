import { describe, expect, it } from 'vitest';
import { incomingMediaBodyText } from '../incomingFileContent';

describe('incomingMediaBodyText', () => {
  it('usa el caption si existe', () => {
    expect(incomingMediaBodyText({
      caption: 'te dejo el pdf',
      fileName: 'contrato.pdf',
      placeholder: '[Archivo]',
    })).toBe('te dejo el pdf');
  });

  it('si no hay caption, usa file_name y nunca el placeholder', () => {
    expect(incomingMediaBodyText({
      caption: null,
      fileName: 'contrato.pdf',
      placeholder: '[Archivo]',
    })).toBe('contrato.pdf');
  });

  it('si no hay caption ni nombre, cae al placeholder', () => {
    expect(incomingMediaBodyText({
      caption: null,
      fileName: undefined,
      placeholder: '[Archivo]',
    })).toBe('[Archivo]');
  });
});
