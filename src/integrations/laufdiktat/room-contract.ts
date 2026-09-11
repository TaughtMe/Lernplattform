import { z } from "zod";

const count = z.number().int().min(0).max(100_000);
const status = z.enum(["lobby", "live", "ended"]);
const name = z.string().min(1).max(64);
const participantToken = z.string().regex(/^[0-9a-f]{48}$/);

export const openedRoomSchema = z.object({
  room_id: z.uuid(),
  code: z.string().regex(/^\d{4}$/),
  access_token: z.string().min(24).max(200),
});
export const joinedRoomSchema = z.object({
  room_id: z.uuid(),
  station_mode: z.boolean(),
  status,
  assigned_student_key: name,
  participant_token: participantToken,
});
export const roomStateSchema = z.object({
  status,
  session_id: z.string().min(1).max(64).nullable(),
  config: z.record(z.string(), z.unknown()),
});
export const progressRowSchema = z.object({
  current_index: count.max(10_000),
  peeks: count,
  attempts: count,
  errors: count,
  finished: z.boolean(),
  duration_ms: z.number().int().min(0).max(86_400_000).nullish(),
  word_errors: z.record(z.string(), count).nullish(),
  station_number: z.number().int().min(1).max(200).nullish(),
});
export const studentRowSchema = progressRowSchema.extend({
  student_key: name,
  app_version: z.string().max(32).nullable(),
});
export const participantRowSchema = z.object({
  student_key: name,
  last_seen_at: z.iso.datetime({ offset: true }).nullable(),
});
export const storedTeacherRoomSchema = z.object({
  roomId: openedRoomSchema.shape.room_id,
  code: openedRoomSchema.shape.code,
  accessToken: openedRoomSchema.shape.access_token,
});
export const storedIdentitySchema = z.object({
  code: openedRoomSchema.shape.code,
  name,
  participantToken,
});

export function parseRpcRows<T>(schema: z.ZodType<T>, data: unknown): T[] {
  return z.array(schema).parse(data);
}
