export type SpellingStrategy =
  "Silbieren" | "Verlängern" | "Ableiten" | "Merken" | "Merkwort";

export type LearningWordCollection = {
  id: string;
  title: string;
  detail: string;
  strategy: SpellingStrategy;
  words: readonly string[];
};

function wordList(source: string): readonly string[] {
  return source.trim().split(/\s+/u);
}

const doubleConsonants = wordList(`
  Affe offen hoffen Löffel Stoff Koffer Kaffee schaffen treffen Griff
  Schiff Pfiff Klasse Kasse Tasse Wasser lassen essen wissen müssen
  besser Fluss Nuss Schloss Schlüssel Kissen Riss nass blass fassen
  passen messen vergessen Adresse Interesse Biss Kuss Sessel Schüssel
  Sonne Tonne Wanne Rinne Spinne gewinnen beginnen rennen brennen können
  kennen nennen trennen dünn Mann Kanne Pfanne Spannung Erinnerung
  Mutter Futter Butter Wetter Ritter Gitter Mitte bitte Kette retten
  wetten Schritt Blatt satt glatt nett Schlitten Schatten Gewitter
  kommen Sommer Zimmer Hammer sammeln Himmel immer schwimmen Lamm
  Trommel Nummer Kamm schlimm dumm Klammer Puppe Suppe Treppe Mappe
  Gruppe knapp Lippen stoppen Teppich Roller Keller Teller Brille
`);

const ckAndTz = wordList(`
  Jacke Ecke Decke Schnecke Strecke Brücke Rücken Zucker Wecker Becker
  Acker packen backen hacken knacken stecken wecken decken lecken schmecken
  drücken pflücken schicken blicken klicken stricken erschrecken entdecken verstecken
  Glück Stück Blick Trick Fleck Stock Block Rock Sack Rucksack Frühstück
  zurück verrückt trocken locker Glocke Flocke Locke Mücke Lücke Krücke
  Hecke Becken Nacken Picknick Schmuck Druck Fleckchen Päckchen Rückblick Eindruck
  Katze Tatze Glatze Mütze Pfütze Spitze Hitze Witze Sitze Plätze
  Schatz Satz Platz Netz Gesetz Verletzung Übersetzung plötzlich nützlich
  schmutzig witzig kratzig sitzen setzen putzen nutzen schützen stützen
  schwitzen spritzen blitzen ritzen kratzen platzen schätzen ersetzen
  letzter jetzt trotzdem Besitz Schnitzel Blitzlicht Putzlappen Matratze Sitzplatz
`);

const finalDevoicing = wordList(`
  Hund Wald Bild Kind Wind Mund Rand Sand Band Land Hand Wand Freund
  Feind Abend Jugend Tugend Gegend Zustand Abstand Grund Herd Pferd
  Bad Rad Lied Kleid Geld Feld Schild Held wild mild rund gesund
  Weg Tag Zug Berg Teig Zweig Steg Krieg Sieg Flug Schlag Vertrag
  Betrag Auftrag Vorschlag Ausflug Eintrag Anfang Ausgang Eingang Umgang
  Klang Gesang Fang Ring Ding Sprung Schwung lang eng jung Zwerg König
  Korb Dieb Staub Urlaub Laub Kalb halb gelb grob lieb Betrieb
  Trieb Sieb Grab Stab Club Job Raub Laubwald Brotkorb Staubfang
  Wegesrand Waldrand Sandstrand Handstand Burg Hundekorb Kinderlied
  Geldbetrag Bergpfad Flugzeug Lieblingslied Tagesausflug Waldweg Feldweg Zugweg
  Magd Leib Trug Ausweg Heimweg Gehweg Rückweg
`);

const umlautDerivation = wordList(`
  Häuser Bäume Räume Zäune Mäuse Läuse Bäuche Sträucher Kräuter Häute
  Bräute Träume Schäume Säume Käufer Läufer Räuber häufig gläubig äußerlich
  räumlich säubern träumen läuten häuslich bäuerlich käuflich räuberisch
  älter kälter wärmer stärker länger härter näher später schärfer
  kräftig mächtig ängstlich ärgerlich täglich jährlich gefährlich
  wählen zählen erzählen quälen schälen nähren lähmen gähnen spät zäh
  Hände Bänder Wände Länder Ränder Kämme Lämmer Männer Blätter Räder
  Gläser Gräser Täler Dächer Fächer Nägel Zähne Gänse Kälber
  fällt hält trägt schläft fährt lädt gräbt bläst rät wäscht wächst
  läuft bäckt fängt hängt lässt hätte wäre käme gäbe nähme
  Äpfel Ärzte Bäcker Jäger Käfer Mädchen Märchen Käfig Säge Träger
`);

const longI = wordList(`
  Biene Brief Dieb Diele Dienstag Fieber Fliege Frieden Gier Gießkanne
  Knie Lied Liebe Miete Riese Schiene Spiegel Spiel Stiefel Tier
  Wiese Ziel Zwiebel sieben vier hier nie wieder diese Spielwiese
  dienen liegen siegen fliegen fließen frieren genießen gießen kriechen
  lieben liefern mieten riechen schieben schießen schließen spielen verlieren wiegen
  ziehen ziemlich schwierig friedlich riesig niedrig Briefpapier Friedenslied
  Briefkasten Briefmarke Liebesbrief Tiergarten Spielplatz Spielzeug Spiegelbild
  Wiesenblume Zieltür Schiebetür Fliegengitter Bienenstock Bienenwabe Tierliebe
  Diebstahl Lieblingsfach Lieblingsessen Lieblingsbuch Lieblingsfarbe
  Kniekehle Mietwohnung Schiedsrichter Friedhof Tierheim Tierarzt Tierfutter
  Zwiebelkuchen Riesenrad Ferien Melodie Industrie Energie Kies Kiefer
  Kiemen Krieg Krieger Stier Trieb Betrieb Antrieb Vertrieb schmierig
  neugierig begierig rieseln sprießen schief tief friedvoll Spieltrieb
`);

const silentH = wordList(`
  Bahn Zahn Hahn Kahn Wahn Zahl Wahl Stahl Strahl Mahl Jahr Gefahr
  fahren erfahren bewahren bezahlen wählen zählen erzählen fehlen empfehlen
  nehmen dehnen lehnen sehnen stehlen befehlen kehren lehren wehren
  Mehl Reh Zeh Fehler Lehrer Verkehr Gewehr Ehre Kehle
  Bohne Sohn Lohn Mohn Rohr Ohr Kohl wohl wohnen bohren drohen froh
  Ohren Wohnung Belohnung Gewohnheit ohne hohl Höhlung Drohung
  Uhr Kuh Schuh Ruhe Truhe Huhn Ruhm Stuhl kühl fühlen führen
  rühren berühren Bühne Mühle Höhle Föhn Sohle Kohle
  Rahmen Sahne Fahne Ahorn Nahrung Wahrheit Zahnrad Zahnarzt Zahncreme Zahnweh
  Wahlfach Fahrbahn Fahrrad Fahrkarte Fahrzeug Jahrgang Jahreszeit
  Mehrzahl Lehrerin Lehrbuch Fehlwort Fehlersuche Wohnhaus Wohnzimmer
  Ohrwurm Bohrmaschine Ruhestand Stuhllehne Fahrstuhl Wohnraum
`);

const memoryAndLoanWords = wordList(`
  Baby Ballett Balkon Banane Büro Café Cent Chance Chaos Charakter
  Chef Chemie Chip Chor Clown Computer Cousin Dame Detail Detektiv
  Direktor Diskussion Doktor E-Mail Energie Englisch Etage Familie Fan
  Fantasie Februar Ferien Firma Foto Garage Genie Gitarre Hobby Hotel
  Idee Information Internet Interview Jeans Joghurt Kabine Kalender Kamera
  Känguru Karate Karton Kino Kiwi Klima Konzert Kristall Labor Laptop
  Maschine Material Mathematik Medizin Melodie Million Minute Museum Musik
  Niveau Notiz November Orange Orchester Paket Papier Park Party Pizza
  Polizei Pony Portemonnaie Praktikum Problem Programm Projekt Pullover
  Quiz Radio Restaurant Rhythmus Roboter Saison Salat Sandwich Service
  Skizze Sofa Spaghetti Sport Station Taxi Team Technik Telefon Theater
  Training Universität Video Vitamin Vulkan Zirkus Zoo
`);

export const LEARNING_WORD_COLLECTIONS: readonly LearningWordCollection[] = [
  {
    id: "double-consonants",
    title: "Doppelkonsonanten",
    detail: "Kurzen Vokal hören und das Wort in Silben sprechen.",
    strategy: "Silbieren",
    words: doubleConsonants,
  },
  {
    id: "ck-tz",
    title: "ck und tz",
    detail: "Die Wortmitte beim deutlichen Silbieren untersuchen.",
    strategy: "Silbieren",
    words: ckAndTz,
  },
  {
    id: "final-devoicing",
    title: "Auslautverhärtung",
    detail: "Das Wort verlängern, damit der Endlaut hörbar wird.",
    strategy: "Verlängern",
    words: finalDevoicing,
  },
  {
    id: "umlaut",
    title: "ä/e und äu/eu",
    detail: "Ein verwandtes Wort suchen und die Schreibung ableiten.",
    strategy: "Ableiten",
    words: umlautDerivation,
  },
  {
    id: "long-i",
    title: "Langes i",
    detail: "Wörter mit ie als feste Wortbilder sichern.",
    strategy: "Merken",
    words: longI,
  },
  {
    id: "silent-h",
    title: "Dehnungs-h",
    detail: "Das h ist nicht zuverlässig hörbar und wird mitgelernt.",
    strategy: "Merken",
    words: silentH,
  },
  {
    id: "memory-words",
    title: "Merkwörter & Fremdwörter",
    detail:
      "Für diese Wörter greift keine verlässliche deutsche Rechtschreibstrategie. Ihr Wortbild wird bewusst eingeprägt.",
    strategy: "Merkwort",
    words: memoryAndLoanWords,
  },
] as const;

export function getLearningWordCollection(id: string) {
  return LEARNING_WORD_COLLECTIONS.find((collection) => collection.id === id);
}
