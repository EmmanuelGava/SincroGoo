export function telefonoDigits(value: string | null | undefined): string | null {
  if (String(value || '').includes('@lid')) return null;
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length < 8) return null;
  if (digits.startsWith('54') && digits[2] !== '9') {
    return `549${digits.slice(2)}`;
  }
  return digits;
}
