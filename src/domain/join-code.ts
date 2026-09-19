const QUERY_KEYS = ["room", "code", "classCode", "invite"] as const;

export function normalizeJoinCode(value: string) {
  return value
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 12);
}

export function extractJoinCode(scannedValue: string) {
  const value = scannedValue.trim();
  try {
    const url = new URL(value);
    for (const key of QUERY_KEYS) {
      const code = normalizeJoinCode(url.searchParams.get(key) ?? "");
      if (code) return code;
    }
  } catch {
    // Plain codes are the normal fallback for printed QR labels.
  }

  const fourDigitRoom = value.match(/(?:^|\D)(\d{4})(?:\D|$)/)?.[1];
  return fourDigitRoom ?? normalizeJoinCode(value);
}
