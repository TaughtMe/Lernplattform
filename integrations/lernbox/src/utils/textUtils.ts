/**
 * Normalizes text for comparison by:
 * 1. Converting to lowercase
 * 2. Removing punctuation
 * 3. Normalizing whitespace (trim + collapse multiple spaces)
 */
export const normalizeAnswer = (text: string): string => {
    return text
        .toLowerCase()
        .replace(/[^\w\s\u00C0-\u017F]|_/g, "") // Remove punctuation, keep words/spaces/unicode chars (German Umlaute etc.)
        .replace(/\s+/g, " ") // Collapse multiple spaces
        .trim();
};
