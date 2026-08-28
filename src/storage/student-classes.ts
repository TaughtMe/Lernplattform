import Dexie, { type Table } from "dexie";
import {
  classEnrollmentSchema,
  type ClassEnrollment,
} from "../domain/class-enrollment";
import { LOCAL_DATA_AREAS } from "./local-data-boundaries";
import {
  studentAssignmentSchema,
  type StudentAssignment,
} from "../domain/student-assignment";

export class StudentClassesDatabase extends Dexie {
  memberships!: Table<ClassEnrollment, string>;
  assignments!: Table<StudentAssignment, string>;
  constructor(name = LOCAL_DATA_AREAS.classes) {
    super(name);
    this.version(1).stores({ memberships: "membershipId, classId, issuedAt" });
    this.version(2).stores({
      memberships: "membershipId, classId, issuedAt",
      assignments: "id, membershipId, classId, status, dueDate, issuedAt",
    });
  }
}
export function createStudentAssignmentRepository(
  database = new StudentClassesDatabase(),
) {
  return {
    list: () => database.assignments.orderBy("issuedAt").reverse().toArray(),
    get: (id: string) => database.assignments.get(id),
    put: async (value: StudentAssignment) => {
      await database.assignments.put(studentAssignmentSchema.parse(value));
    },
  };
}
export function createStudentClassesRepository(
  database = new StudentClassesDatabase(),
) {
  return {
    list: () => database.memberships.orderBy("issuedAt").reverse().toArray(),
    put: (value: ClassEnrollment) =>
      database.memberships.put(classEnrollmentSchema.parse(value)),
  };
}
