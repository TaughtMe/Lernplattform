import React from 'react';
import { ArrowLeft, Scale, Shield, Code } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const LegalPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background text-text-main p-6 transition-colors duration-200">
            {/* Header */}
            <div className="max-w-3xl mx-auto mb-8 flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-full hover:bg-surface transition-colors duration-200"
                    aria-label="Zurück"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-2xl font-bold">Rechtliche Hinweise</h1>
            </div>

            <div className="max-w-3xl mx-auto space-y-8">

                {/* Section 1: Impressum */}
                <article className="bg-surface rounded-2xl p-6 border border-border-default shadow-sm">
                    <div className="flex items-center gap-3 mb-6 border-b border-border-default pb-4">
                        <Scale className="w-6 h-6 text-primary" />
                        <h2 className="text-xl font-bold">Impressum</h2>
                    </div>

                    <div className="space-y-4 text-text-muted">
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-text-main mb-2">Angaben gemäß § 5 DDG</h3>
                            <p className="text-text-muted">
                                <strong>Verantwortlich für den Inhalt:</strong><br />
                                Toby Bryson<br />
                                c/o Sebastian-Kneipp-Mittelschule<br />
                                Kemptener Straße 7<br />
                                87730 Bad Grönenbach<br />
                                <br />
                                <strong>Kontakt:</strong><br />
                                E-Mail: <a href="mailto:toby.bryson@schule.bayern.de" className="text-primary hover:underline">toby.bryson@schule.bayern.de</a>
                            </p>
                        </div>
                    </div>
                </article>

                {/* Section 2: Datenschutzerklärung */}
                <article className="bg-surface rounded-2xl p-6 border border-border-default shadow-sm">
                    <div className="flex items-center gap-3 mb-6 border-b border-border-default pb-4">
                        <Shield className="w-6 h-6 text-primary" />
                        <h2 className="text-xl font-bold">Datenschutzerklärung (DSGVO)</h2>
                    </div>

                    <div className="space-y-6 text-text-muted">
                        <div>
                            <h3 className="font-semibold text-text-main mb-2">Datenspeicherung</h3>
                            <p>Wir speichern Ihren persönlichen Lernfortschritt ausschließlich lokal auf Ihrem Endgerät (Local Storage / IndexedDB). Es findet keine Übertragung an externe Cloud-Datenbanken statt. Da wir keine Benutzerkonten führen, verbleiben alle Daten in Ihrer Kontrolle.</p>
                        </div>

                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-text-main mb-2">Hosting & Bereitstellung</h3>
                            <p className="text-text-muted leading-relaxed">
                                Diese Anwendung wird über <strong>Cloudflare Pages</strong> (Cloudflare Inc., San Francisco, USA) bereitgestellt.
                                Um die Webseite an Ihr Gerät auszuliefern, werden technisch notwendige Verbindungsdaten (z.B. Ihre IP-Adresse)
                                kurzzeitig von Cloudflare verarbeitet. Dies erfolgt auf Grundlage unseres berechtigten Interesses an einer
                                sicheren und schnellen Bereitstellung des Angebots (Art. 6 Abs. 1 lit. f DSGVO).
                                Es werden keine dauerhaften Server-Logfiles gespeichert, die eine Identifizierung von Personen ermöglichen.
                            </p>
                        </div>

                        <div>
                            <h3 className="font-semibold text-text-main mb-2">Keine Tracking-Cookies & Analyse-Tools</h3>
                            <p>Diese Anwendung verwendet <strong>keine</strong> externen Tracking-Tools wie Google Analytics, Matomo oder Facebook Pixel. Wir setzen keine Werbe-Tracker ein.</p>
                        </div>

                        <div>
                            <h3 className="font-semibold text-text-main mb-2">Ihre Rechte</h3>
                            <p>Sie haben jederzeit das Recht auf unentgeltliche Auskunft über Ihre gespeicherten personenbezogenen Daten, deren Herkunft und Empfänger und den Zweck der Datenverarbeitung sowie ein Recht auf Berichtigung, Sperrung oder Löschung dieser Daten.</p>
                        </div>
                    </div>
                </article>

                {/* Section 3: Software-Lizenzen & Credits */}
                <article className="bg-surface rounded-2xl p-6 border border-border-default shadow-sm">
                    <div className="flex items-center gap-3 mb-6 border-b border-border-default pb-4">
                        <Code className="w-6 h-6 text-primary" />
                        <h2 className="text-xl font-bold">Open Source Credits</h2>
                    </div>

                    <div className="text-text-muted space-y-4">
                        <p>Diese App wurde mit Hilfe großartiger Open-Source-Software erstellt:</p>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <li className="p-3 bg-background rounded-lg border border-border-default">
                                <strong className="text-text-main block">React</strong>
                                <span className="text-xs">Meta Platforms, Inc. (MIT License)</span>
                            </li>
                            <li className="p-3 bg-background rounded-lg border border-border-default">
                                <strong className="text-text-main block">Tailwind CSS</strong>
                                <span className="text-xs">Tailwind Labs, Inc. (MIT License)</span>
                            </li>
                            <li className="p-3 bg-background rounded-lg border border-border-default">
                                <strong className="text-text-main block">Lucide Icons</strong>
                                <span className="text-xs">Lucide Contributors (ISC License)</span>
                            </li>
                            <li className="p-3 bg-background rounded-lg border border-border-default">
                                <strong className="text-text-main block">Vite</strong>
                                <span className="text-xs">Yuxi (Evan) You (MIT License)</span>
                            </li>
                        </ul>
                    </div>
                </article>

            </div>
        </div>
    );
};
