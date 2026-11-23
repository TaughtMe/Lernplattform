/*
 * Lernraum-Phonemizer: wandelt Text mit eSpeak NG in IPA-Lautschrift um.
 * Erzeugt keinen Ton; das Audio entsteht im Sprachmodell (KittenTTS).
 *
 * Copyright (C) 2026 Lernraum
 *
 * This program is free software: you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option)
 * any later version. It is linked with eSpeak NG (GPL-3.0-or-later).
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License
 * (LIZENZ-GPL-3.0.txt) for more details.
 */
#include <stdlib.h>
#include <string.h>
#include <emscripten.h>
#include <espeak-ng/speak_lib.h>

static char *result = NULL;
static size_t result_size = 0;

/* Hängt einen Satzteil an das Ergebnis an, getrennt durch ein Leerzeichen. */
static int append(const char *part) {
  size_t used = result ? strlen(result) : 0;
  size_t need = used + strlen(part) + 2;
  if (need > result_size) {
    size_t size = need * 2;
    char *grown = realloc(result, size);
    if (!grown) return 0;
    if (!result) grown[0] = '\0';
    result = grown;
    result_size = size;
  }
  if (used > 0) strcat(result, " ");
  strcat(result, part);
  return 1;
}

/* Lädt die Sprachdaten aus /espeak-ng-data. 0 bei Erfolg. */
EMSCRIPTEN_KEEPALIVE int lr_init(void) {
  int rate = espeak_Initialize(AUDIO_OUTPUT_SYNCHRONOUS, 0, "/",
                               espeakINITIALIZE_DONT_EXIT);
  return rate > 0 ? 0 : -1;
}

/* Wählt die Sprache, z. B. "de" oder "en-us". 0 bei Erfolg. */
EMSCRIPTEN_KEEPALIVE int lr_set_voice(const char *name) {
  return espeak_SetVoiceByName(name) == EE_OK ? 0 : -1;
}

/*
 * Lautschrift (IPA mit Betonungszeichen) für einen UTF-8-Text. Satzzeichen
 * fallen weg; der Aufrufer setzt sie wieder ein. Das Ergebnis gilt bis zum
 * nächsten Aufruf.
 */
EMSCRIPTEN_KEEPALIVE const char *lr_phonemize(const char *text) {
  if (result) result[0] = '\0';
  const void *cursor = text;
  while (cursor) {
    const char *clause =
        espeak_TextToPhonemes(&cursor, espeakCHARS_UTF8, espeakPHONEMES_IPA);
    if (clause && clause[0] && !append(clause)) return NULL;
  }
  if (!result && !append("")) return NULL;
  return result;
}
