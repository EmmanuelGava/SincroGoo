import { describe, expect, it } from 'vitest';
import { parseOgHtml } from '../ogHtml';

const OG_FIXTURE = `<!doctype html>
<html>
<head>
  <meta property="og:title" content="Titulo OG">
  <meta property="og:description" content="Una descripcion">
  <meta property="og:image" content="https://cdn.example.com/thumb.jpg">
  <meta property="og:site_name" content="Example Site">
  <title>Titulo del documento</title>
</head>
<body>hola</body>
</html>`;

const TITLE_ONLY_FIXTURE = `<!doctype html>
<html>
<head>
  <title>Solo title</title>
</head>
</html>`;

const EMPTY_FIXTURE = `<!doctype html><html><head></head><body></body></html>`;

describe('parseOgHtml', () => {
  it('lee og:title, description, image y site_name', () => {
    expect(parseOgHtml(OG_FIXTURE, 'example.com')).toEqual({
      title: 'Titulo OG',
      description: 'Una descripcion',
      image: 'https://cdn.example.com/thumb.jpg',
      siteName: 'Example Site',
    });
  });

  it('si no hay OG, usa <title> y hostname como siteName', () => {
    expect(parseOgHtml(TITLE_ONLY_FIXTURE, 'hostname.example')).toEqual({
      title: 'Solo title',
      description: '',
      image: null,
      siteName: 'hostname.example',
    });
  });

  it('HTML ok sin OG ni title: title = hostname, sin imagen', () => {
    expect(parseOgHtml(EMPTY_FIXTURE, 'solo-host.com')).toEqual({
      title: 'solo-host.com',
      description: '',
      image: null,
      siteName: 'solo-host.com',
    });
  });
});
