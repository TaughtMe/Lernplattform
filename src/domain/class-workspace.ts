import * as z from "zod";

export const classModuleSchema = z.enum([
  "vocabulary",
  "german",
  "mathematics",
  "typing",
  "running-dictation",
]);

export const classAssignmentSchema = z
  .object({
    id: z.string().trim().min(1),
    title: z.string().trim().min(1).max(200),
    module: classModuleSchema,
    description: z.string().trim().min(1).max(500),
    route: z.string().startsWith("/"),
    status: z.enum(["new", "in-progress", "completed"]),
    rankingEligible: z.boolean(),
    dueLabel: z.string().trim().min(1).max(100).optional(),
  })
  .strict();

export const todayPracticeItemSchema = z
  .object({
    id: z.string().trim().min(1),
    title: z.string().trim().min(1).max(200),
    module: classModuleSchema,
    reason: z.enum(["due", "error", "teacher"]),
    amount: z.number().int().positive(),
    route: z.string().startsWith("/"),
    rankingEligible: z.literal(true),
  })
  .strict();

export const classWorkspaceSchema = z
  .object({
    id: z.string().trim().min(1),
    name: z.string().trim().min(1).max(120),
    teacherName: z.string().trim().min(1).max(120),
    schoolYear: z.string().trim().min(1).max(40),
    enabledModules: z.array(classModuleSchema).min(1),
    todayPractice: z.array(todayPracticeItemSchema),
    assignments: z.array(classAssignmentSchema),
  })
  .strict()
  .superRefine((workspace, context) => {
    const enabled = new Set(workspace.enabledModules);
    if (enabled.size !== workspace.enabledModules.length) {
      context.addIssue({
        code: "custom",
        message: "Ein Klassenmodul darf nur einmal aktiviert sein.",
        path: ["enabledModules"],
      });
    }

    for (const [collectionName, entries] of [
      ["todayPractice", workspace.todayPractice],
      ["assignments", workspace.assignments],
    ] as const) {
      for (const [index, entry] of entries.entries()) {
        if (!enabled.has(entry.module)) {
          context.addIssue({
            code: "custom",
            message: `Das Modul ${entry.module} ist für diese Klasse nicht aktiviert.`,
            path: [collectionName, index, "module"],
          });
        }
      }
    }
  });

export type ClassModule = z.infer<typeof classModuleSchema>;
export type ClassAssignment = z.infer<typeof classAssignmentSchema>;
export type TodayPracticeItem = z.infer<typeof todayPracticeItemSchema>;
export type ClassWorkspace = z.infer<typeof classWorkspaceSchema>;

export function parseClassWorkspace(value: unknown): ClassWorkspace {
  return classWorkspaceSchema.parse(value);
}

export const CLASS_MODULE_LABELS: Record<ClassModule, string> = {
  vocabulary: "Vokabeln",
  german: "Deutsch",
  mathematics: "Mathematik",
  typing: "Tipptraining",
  "running-dictation": "Laufdiktat",
};
