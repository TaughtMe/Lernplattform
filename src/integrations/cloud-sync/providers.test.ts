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

  it("macht OneDrive und Google Drive von der Client-ID abhängig", () => {
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
    expect(available({ onedrive: null, "google-drive": "xyz" })).toEqual({
      onedrive: false,
      "google-drive": true,
      webdav: true,
    });
  });
});
