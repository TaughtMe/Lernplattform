import * as z from "zod";

export const TEACHER_CONTENT_LIBRARY_FORMAT =
  "lernraum.teacher-content-library" as const;
export const TEACHER_CONTENT_LIBRARY_VERSION = 1 as const;

export const teacherContentPackageSchema = z
  .object({
    id: z.string().trim().min(1).max(200),
    revision: z.number().int().nonnegative(),
    title: z.string().trim().min(1).max(300),
    source: z.string().min(1).max(5_000_000),
    promptLocale: z.string().trim().min(2).max(35),
    answerLocale: z.string().trim().min(2).max(35),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
  })
  .strict();

export const teacherContentLibraryFileSchema = z
  .object({
    format: z.literal(TEACHER_CONTENT_LIBRARY_FORMAT),
    version: z.literal(TEACHER_CONTENT_LIBRARY_VERSION),
    exportedAt: z.iso.datetime({ offset: true }),
    packages: z.array(teacherContentPackageSchema).max(10_000),
  })
  .strict()
  .superRefine((library, context) => {
    const ids = new Set<string>();
    for (const [index, entry] of library.packages.entries()) {
      if (ids.has(entry.id)) {
        context.addIssue({
          code: "custom",
          message: `Doppelte Paket-ID: ${entry.id}`,
          path: ["packages", index, "id"],
        });
      }
      ids.add(entry.id);
    }
  });

export type TeacherContentPackage = z.infer<typeof teacherContentPackageSchema>;
export type TeacherContentLibraryFile = z.infer<
  typeof teacherContentLibraryFileSchema
>;

export function createTeacherContentLibraryFile(
  packages: readonly TeacherContentPackage[],
  exportedAt = new Date().toISOString(),
): TeacherContentLibraryFile {
  return teacherContentLibraryFileSchema.parse({
    format: TEACHER_CONTENT_LIBRARY_FORMAT,
    version: TEACHER_CONTENT_LIBRARY_VERSION,
    exportedAt,
    packages: [...packages].sort((left, right) =>
      left.id.localeCompare(right.id),
    ),
  });
}

export function parseTeacherContentLibraryFile(
  value: unknown,
): TeacherContentLibraryFile {
  return teacherContentLibraryFileSchema.parse(value);
}
