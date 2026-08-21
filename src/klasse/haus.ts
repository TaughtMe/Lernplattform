import { randomId } from "./roster.ts";

export interface HouseV1 {
  id: string;
  classId: string;
  name: string;
  createdAt: string;
}

export function createHouse(classId: string, name: string, now: string = new Date().toISOString()): HouseV1 {
  return { id: randomId(9), classId, name, createdAt: now };
}
