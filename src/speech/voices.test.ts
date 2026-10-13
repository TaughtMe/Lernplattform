import { describe, expect, it } from "vitest";
import {
  normalizeSpeechLang,
  pickVoice,
  rankVoice,
  type SpeechVoiceLike,
} from "./voices";

function voice(
  name: string,
  lang: string,
  extra: Partial<SpeechVoiceLike> = {},
): SpeechVoiceLike {
  return { name, lang, voiceURI: name, ...extra };
}

describe("normalizeSpeechLang", () => {
  it.each([
    ["de", "de-DE"],
    ["en", "en-GB"],
    ["fr", "fr-FR"],
    ["es", "es-ES"],
    ["DE", "de-DE"],
    ["de-de", "de-DE"],
    ["de_AT", "de-AT"],
    ["EN-us", "en-US"],
    ["it", "it"],
    ["pt-br", "pt-BR"],
    [" de-DE ", "de-DE"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeSpeechLang(input)).toBe(expected);
  });
});

describe("rankVoice", () => {
  it("excludes other languages", () => {
    expect(rankVoice(voice("Samantha", "en-US"), "de-DE")).toBeNull();
  });

  it("prefers the exact region over the same language with another region", () => {
    const exact = rankVoice(voice("Anna", "de-DE"), "de-DE")!;
    const other = rankVoice(voice("Anna", "de-AT"), "de-DE")!;
    expect(exact).toBeGreaterThan(other);
  });

  it("accepts underscores and short codes on either side", () => {
    expect(rankVoice(voice("Anna", "de_DE"), "de")).toBe(
      rankVoice(voice("Anna", "de-DE"), "de-DE"),
    );
  });

  it("rewards quality markers", () => {
    const plain = rankVoice(voice("Anna", "de-DE"), "de-DE")!;
    for (const name of [
      "Microsoft Katja Online (Natural)",
      "Anna (Premium)",
      "Anna (Enhanced)",
      "Siri Stimme 1",
      "Google Deutsch",
      "Neural Voice",
    ]) {
      expect(rankVoice(voice(name, "de-DE"), "de-DE")!, name).toBeGreaterThan(
        plain,
      );
    }
  });

  it("penalises known weak voices", () => {
    const plain = rankVoice(voice("Anna", "de-DE"), "de-DE")!;
    expect(rankVoice(voice("eSpeak German", "de-DE"), "de-DE")!).toBeLessThan(
      plain,
    );
    expect(
      rankVoice(
        voice("Anna", "de-DE", {
          voiceURI: "com.apple.voice.compact.de-DE.Anna",
        }),
        "de-DE",
      )!,
    ).toBeLessThan(plain);
  });

  it("uses the system default as a tie-break only", () => {
    const normal = rankVoice(voice("Anna", "de-DE"), "de-DE")!;
    const preferred = rankVoice(
      voice("Anna", "de-DE", { default: true }),
      "de-DE",
    )!;
    expect(preferred).toBe(normal + 1);
  });
});

describe("pickVoice", () => {
  it("returns null for an empty list and for foreign languages only", () => {
    expect(pickVoice([], "de-DE")).toBeNull();
    expect(pickVoice([voice("Samantha", "en-US")], "de-DE")).toBeNull();
  });

  it("picks a premium voice over a simple one", () => {
    const voices = [voice("Anna", "de-DE"), voice("Anna (Premium)", "de-DE")];
    expect(pickVoice(voices, "de-DE")?.name).toBe("Anna (Premium)");
  });

  it("prefers the exact region even against a better voice of another region", () => {
    const voices = [voice("Katja", "de-DE"), voice("Google Deutsch", "de-AT")];
    expect(pickVoice(voices, "de-DE")?.name).toBe("Katja");
  });

  it("falls back to the same language in another region", () => {
    expect(pickVoice([voice("Helena", "de-AT")], "de-DE")?.name).toBe("Helena");
  });

  it("lets a saved preference win over the automatic choice", () => {
    const voices = [
      voice("Anna (Premium)", "de-DE"),
      voice("Markus", "de-DE", { voiceURI: "markus-uri" }),
    ];
    expect(pickVoice(voices, "de-DE", "markus-uri")?.name).toBe("Markus");
  });

  it("ignores a preference that is missing or of another language", () => {
    const voices = [
      voice("Anna (Premium)", "de-DE"),
      voice("Samantha", "en-US", { voiceURI: "sam" }),
    ];
    expect(pickVoice(voices, "de-DE", "gibt-es-nicht")?.name).toBe(
      "Anna (Premium)",
    );
    expect(pickVoice(voices, "de-DE", "sam")?.name).toBe("Anna (Premium)");
    expect(pickVoice(voices, "de-DE", null)?.name).toBe("Anna (Premium)");
  });

  it("keeps the first of equally ranked voices", () => {
    const voices = [voice("A", "de-DE"), voice("B", "de-DE")];
    expect(pickVoice(voices, "de-DE")?.name).toBe("A");
  });
});
