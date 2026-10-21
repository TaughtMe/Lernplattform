import * as z from "zod";

/**
 * Tolerantes Lesen gespeicherter Datensätze (Audit A-001, Regel S-1).
 *
 * Geschrieben wird mit den strengen Schemata. Gelesen wird mit einer daraus
 * abgeleiteten Variante, die unbekannte Zusatzfelder entfernt statt den
 * Datensatz abzulehnen (neuere App-Version, zurückgerollte Version, zweiter Tab
 * mit altem Stand). Datensätze, die auch dann ungültig sind (z. B. unbekannter
 * Enum-Wert), werden nicht verwendet und nicht gelöscht, sondern gezählt.
 * Unbekannte Werte werden bewusst nicht auf „unbekannt“ abgebildet.
 */

/** Ein Datensatz, den diese App-Version nicht lesen kann; er bleibt gespeichert. */
export type QuarantinedRecord = {
  table: string;
  /** Schlüssel des Datensatzes; ohne Schlüssel die Position als `#n`. */
  id: string;
};

export type TolerantReadResult<T> = {
  items: T[];
  quarantined: QuarantinedRecord[];
};

type AnySchema = z.ZodType;

/** Die Teile einer Zod-Definition, die für die Lese-Variante relevant sind. */
type Def = {
  type: string;
  shape?: Record<string, AnySchema>;
  catchall?: AnySchema | undefined;
  element?: AnySchema;
  innerType?: AnySchema;
  options?: AnySchema[];
  valueType?: AnySchema;
  items?: AnySchema[];
  rest?: AnySchema;
};

const readSchemas = new WeakMap<AnySchema, AnySchema>();

const defOf = (schema: AnySchema) =>
  (schema as unknown as { _zod: { def: Def } })._zod.def;

/** Neues Schema mit geänderter Definition; Prüfungen (`refine`) bleiben erhalten. */
const withDef = (schema: AnySchema, def: Def): AnySchema =>
  (schema as unknown as { clone(def: Def): AnySchema }).clone(def);

function derive(schema: AnySchema): AnySchema {
  const def = defOf(schema);
  switch (def.type) {
    case "object": {
      const { catchall } = def;
      return withDef(schema, {
        ...def,
        shape: Object.fromEntries(
          Object.entries(def.shape ?? {}).map(([key, value]) => [
            key,
            lenientReadSchema(value),
          ]),
        ),
        // Nur `.strict()` (catchall `never`) wird aufgeweicht; `looseObject` bleibt.
        catchall:
          catchall && defOf(catchall).type !== "never" ? catchall : undefined,
      });
    }
    case "array":
      return withDef(schema, {
        ...def,
        element: lenientReadSchema(def.element!),
      });
    case "optional":
    case "nullable":
    case "default":
    case "prefault":
    case "nonoptional":
    case "readonly":
    case "catch":
      return withDef(schema, {
        ...def,
        innerType: lenientReadSchema(def.innerType!),
      });
    case "union":
    case "discriminatedUnion":
      return withDef(schema, {
        ...def,
        options: def.options!.map((option) => lenientReadSchema(option)),
      });
    case "record":
      return withDef(schema, {
        ...def,
        valueType: lenientReadSchema(def.valueType!),
      });
    case "tuple":
      return withDef(schema, {
        ...def,
        items: def.items!.map((item) => lenientReadSchema(item)),
        ...(def.rest ? { rest: lenientReadSchema(def.rest) } : {}),
      });
    default:
      // Blätter (string, number, enum, literal, boolean …) bleiben, wie sie sind.
      return schema;
  }
}

/**
 * Lese-Variante eines strengen Schemas: unbekannte Felder werden überall
 * entfernt (auch in verschachtelten Objekten), alle Werte und Pflichtfelder
 * bleiben so streng wie im Schreibschema.
 */
export function lenientReadSchema<S extends AnySchema>(schema: S): S {
  const cached = readSchemas.get(schema);
  if (cached) return cached as S;
  const derived = derive(schema);
  readSchemas.set(schema, derived);
  return derived as S;
}

function recordId(record: unknown, index: number): string {
  if (record && typeof record === "object") {
    const keys = record as { id?: unknown; day?: unknown };
    const key = keys.id ?? keys.day;
    if (typeof key === "string" && key) return key;
  }
  return `#${index}`;
}

/** Liest einen Datensatz; `undefined`, wenn er auch tolerant nicht lesbar ist. */
export function readOneTolerant<S extends AnySchema>(
  schema: S,
  record: unknown,
): z.output<S> | undefined {
  const parsed = lenientReadSchema(schema).safeParse(record);
  return parsed.success ? (parsed.data as z.output<S>) : undefined;
}

/** Liest viele Datensätze; unlesbare kommen mit Tabelle und Schlüssel in die Quarantäne. */
export function readTolerant<S extends AnySchema>(
  schema: S,
  records: readonly unknown[],
  table: string,
): TolerantReadResult<z.output<S>> {
  const reader = lenientReadSchema(schema);
  const items: z.output<S>[] = [];
  const quarantined: QuarantinedRecord[] = [];
  for (const [index, record] of records.entries()) {
    const parsed = reader.safeParse(record);
    if (parsed.success) items.push(parsed.data as z.output<S>);
    else quarantined.push({ table, id: recordId(record, index) });
  }
  return { items, quarantined };
}
