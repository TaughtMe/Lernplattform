const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/** Base64url ohne Padding — funktioniert identisch in Browser und Node, ohne auf `btoa`/`Buffer` angewiesen zu sein. */
export function base64UrlEncode(bytes: Uint8Array): string {
  let result = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    result += ALPHABET[b0 >> 2];
    result += ALPHABET[((b0 & 0x03) << 4) | (b1 === undefined ? 0 : b1 >> 4)];
    if (b1 !== undefined) result += ALPHABET[((b1 & 0x0f) << 2) | (b2 === undefined ? 0 : b2 >> 6)];
    if (b2 !== undefined) result += ALPHABET[b2 & 0x3f];
  }
  return result;
}

export function base64UrlDecode(text: string): Uint8Array<ArrayBuffer> {
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of text) {
    const value = ALPHABET.indexOf(char);
    if (value === -1) throw new Error(`Ungültiges Base64url-Zeichen: ${char}`);
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return new Uint8Array(bytes);
}

export function encodeText(text: string): string {
  return base64UrlEncode(new TextEncoder().encode(text));
}

export function decodeText(encoded: string): string {
  return new TextDecoder().decode(base64UrlDecode(encoded));
}
