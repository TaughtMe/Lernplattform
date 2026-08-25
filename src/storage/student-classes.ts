import Dexie, { type Table } from "dexie";
import {
  classEnrollmentSchema,
  type ClassEnrollment,
} from "../domain/class-enrollment";
import { LOCAL_DATA_AREAS } from "./local-data-boundaries";

export class StudentClassesDatabase extends Dexie {
  memberships!: Table<ClassEnrollment, string>;
  constructor(name = LOCAL_DATA_AREAS.classes) {
    super(name);
    this.version(1).stores({ memberships: "membershipId, classId, issuedAt" });
  }
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
