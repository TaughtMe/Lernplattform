import { describe, expect, it } from "vitest";
import { cloudProviders } from "./providers";

const available = (ids: Parameters<typeof cloudProviders>[0]) =>
  Object.fromEntries(cloudProviders(ids).map((p) => [p.id, p.available]));

describe("cloudProviders", () => {
  it("führt alle drei Anbieter in fester Reihenfolge", () => {
    expect(
      cloudProviders({ onedrive: null, "google-drive": null }).map((p) => p.id),
    ).toEqual(["onedrive", "google-drive", "webdav"]);
  });

  it("macht OneDrive von der Client-ID abhängig; Google Drive bleibt aus", () => {
    expect(available({ onedrive: null, "google-drive": null })).toEqual({
      onedrive: false,
      "google-drive": false,
      webdav: true,
    });
    expect(available({ onedrive: "abc", "google-drive": null })).toEqual({
      onedrive: true,
      "google-drive": false,
      webdav: true,
    });
    // Google Drive ist abgeschaltet (Entscheidung 59), auch mit Client-ID.
    expect(available({ onedrive: null, "google-drive": "xyz" })).toEqual({
      onedrive: false,
      "google-drive": false,
      webdav: true,
    });
  });
});
