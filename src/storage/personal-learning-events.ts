import Dexie, { type Table } from "dexie";
import type { LearningEventV1 } from "../domain/learning-bundle";
import {
  LOCAL_DATA_AREAS,
  type LocalRepository,
} from "./local-data-boundaries";

export class PersonalLearningDatabase extends Dexie {
  learningEvents!: Table<LearningEventV1, string>;

  constructor(name: string = LOCAL_DATA_AREAS.personal) {
    super(name);
    this.version(1).stores({
      learningEvents: "id, learningObjectId, occurredAt, roundId",
    });
  }
}

export function createPersonalLearningEventRepository(
  database = new PersonalLearningDatabase(),
): LocalRepository<LearningEventV1> {
  return {
    get: (id) => database.learningEvents.get(id),
    list: () =>
      database.learningEvents.orderBy("occurredAt").reverse().toArray(),
    put: async (value) => {
      await database.learningEvents.put(value);
    },
    remove: async (id) => {
      await database.learningEvents.delete(id);
    },
  };
}
