export const LOCAL_DATA_AREAS = {
  personal: "lernraum:personal:v1",
  classes: "lernraum:classes:v1",
  teacher: "lernraum:teacher:v1",
} as const;

export type LocalDataArea = keyof typeof LOCAL_DATA_AREAS;

export interface LocalRepository<T extends { id: string }> {
  get(id: string): Promise<T | undefined>;
  list(): Promise<T[]>;
  put(value: T): Promise<void>;
  remove(id: string): Promise<void>;
}

/**
 * Storage adapters must be created with one explicit area. An adapter must never
 * read from another area implicitly; transfers happen through versioned bundles.
 */
export interface LocalRepositoryFactory {
  open<T extends { id: string }>(
    area: LocalDataArea,
    collection: string,
  ): LocalRepository<T>;
}
