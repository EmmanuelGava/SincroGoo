import { describe, expect, it } from 'vitest';
import { extractFirstHttpUrl, isUrlOnlyMessage, splitTextWithLinks } from '../extractFirstUrl';

describe('extractFirstHttpUrl', () => {
  it('devuelve la URL cuando el mensaje es solo esa URL', () => {
    expect(extractFirstHttpUrl('https://example.com/path')).toBe('https://example.com/path');
    expect(extractFirstHttpUrl('  http://example.com  ')).toBe('http://example.com');
  });

  it('devuelve la primera URL cuando hay texto alrededor', () => {
    expect(extractFirstHttpUrl('mirá esto https://example.com/a y más')).toBe('https://example.com/a');
  });

  it('si hay varias URLs, se queda con la primera', () => {
    expect(
      extractFirstHttpUrl('https://primero.com y después https://segundo.com')
    ).toBe('https://primero.com');
  });

  it('ignora esquemas que no son http(s)', () => {
    expect(extractFirstHttpUrl('ftp://files.example.com/x')).toBeNull();
    expect(extractFirstHttpUrl('www.example.com/sin-esquema')).toBeNull();
    expect(extractFirstHttpUrl('file:///etc/passwd')).toBeNull();
  });
});

describe('isUrlOnlyMessage', () => {
  it('es true si el texto recortado es exactamente la URL', () => {
    expect(isUrlOnlyMessage('  https://example.com  ', 'https://example.com')).toBe(true);
  });

  it('es false si hay más texto', () => {
    expect(isUrlOnlyMessage('mirá https://example.com', 'https://example.com')).toBe(false);
  });
});

describe('splitTextWithLinks', () => {
  it('marca cada http(s) URL para renderizar como <a>', () => {
    const parts = splitTextWithLinks('hola https://a.com y https://b.com');
    expect(parts).toEqual([
      { type: 'text', value: 'hola ' },
      { type: 'link', value: 'https://a.com' },
      { type: 'text', value: ' y ' },
      { type: 'link', value: 'https://b.com' },
    ]);
  });
});
