/** Base64-Hilfen für WebCrypto-Daten; gemeinsam für Transfer und Geräte-Abgleich. */
export function bytesToBase64(value: Uint8Array): string {
  const chunks: string[] = [];
  for (let offset = 0; offset < value.length; offset += 0x8000) {
    chunks.push(
      String.fromCharCode(...value.subarray(offset, offset + 0x8000)),
    );
  }
  return btoa(chunks.join(""));
}

export function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const result = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    result[index] = binary.charCodeAt(index);
  }
  return result;
}
