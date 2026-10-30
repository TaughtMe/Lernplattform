/**
 * Läuft inline im <head>, noch vor der Hydration (wie das Theme-Skript).
 * Solange `<html data-hydrated>` fehlt, bleiben Textfelder für Eingaben
 * gesperrt: React setzt ein Feld bei der Hydration auf seinen Startwert
 * zurück, vorher getippter Text wäre weg. Berühren und Klicken sperrt die
 * CSS-Regel in base.css; diese Sperre fängt Tastatur, Einfügen und Diktat ab.
 */
export const hydrationBootScript = `document.addEventListener("beforeinput",function(e){if(document.documentElement.hasAttribute("data-hydrated"))return;var t=e.target;if(t&&(t.tagName==="INPUT"||t.tagName==="TEXTAREA"))e.preventDefault()},true)`;
