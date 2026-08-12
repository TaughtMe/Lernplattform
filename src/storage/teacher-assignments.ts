import Dexie, { type Table } from "dexie";
import {
  teacherAssignmentDraftSchema,
  type TeacherAssignmentDraft,
} from "../domain/teacher-assignment";
import { LOCAL_DATA_AREAS } from "./local-data-boundaries";

export class TeacherAssignmentDatabase extends Dexie {
  assignments!: Table<TeacherAssignmentDraft, string>;

  constructor(name: string = `${LOCAL_DATA_AREAS.teacher}:assignments`) {
    super(name);
    this.version(1).stores({
      assignments: "id, classId, module, placement, status, updatedAt",
    });
  }
}

export function createTeacherAssignmentRepository(
  database = new TeacherAssignmentDatabase(),
) {
  return {
    listForClass: async (classId: string) =>
      database.assignments
        .where("classId")
        .equals(classId)
        .toArray()
        .then((assignments) =>
          assignments.sort((left, right) =>
            right.updatedAt.localeCompare(left.updatedAt),
          ),
        ),
    put: async (assignment: TeacherAssignmentDraft) => {
      await database.assignments.put(
        teacherAssignmentDraftSchema.parse(assignment),
      );
    },
    remove: async (id: string) => {
      await database.assignments.delete(id);
    },
  };
}
