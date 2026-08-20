import { describe, expect, it } from 'vitest';
import { phoneFromUSyncRow } from '../peerIdentity';

describe('phoneFromUSyncRow', () => {
  const lidDigits = '205613590122651';

  it('usa el campo lid del protocolo USync, no el jid LID', () => {
    expect(
      phoneFromUSyncRow(
        { id: '205613590122651@lid', lid: '5491123456789@s.whatsapp.net' },
        lidDigits
      )
    ).toBe('5491123456789');
  });

  it('acepta el teléfono con sufijo de dispositivo', () => {
    expect(
      phoneFromUSyncRow(
        { id: '205613590122651@lid', lid: '5491123456789:0@s.whatsapp.net' },
        lidDigits
      )
    ).toBe('5491123456789');
  });

  it('acepta phoneNumber del contacto', () => {
    expect(
      phoneFromUSyncRow(
        { id: '205613590122651@lid', phoneNumber: '5491199998888@s.whatsapp.net' },
        lidDigits
      )
    ).toBe('5491199998888');
  });

  it('ignora el propio LID disfrazado de teléfono', () => {
    expect(
      phoneFromUSyncRow(
        { id: '205613590122651@lid', lid: '205613590122651@lid' },
        lidDigits
      )
    ).toBeNull();
  });
});
