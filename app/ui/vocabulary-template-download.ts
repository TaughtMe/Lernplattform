import {
  VOCABULARY_TEMPLATE_FILENAME,
  buildVocabularyTemplate,
} from "../../src/domain/vocabulary-import";

/** Lädt die Vorlage `vokabeln-vorlage.csv` (UTF-8 mit BOM) herunter. */
export function downloadVocabularyTemplate() {
  const url = URL.createObjectURL(
    new Blob([buildVocabularyTemplate()], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = VOCABULARY_TEMPLATE_FILENAME;
  anchor.click();
  URL.revokeObjectURL(url);
}
