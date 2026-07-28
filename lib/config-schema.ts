/**
 * Zod schema for game config validation.
 * Exports parseGameConfig (throws) and safeParseGameConfig (returns result).
 */

import { z } from "zod";
import type { GameConfig } from "@/lib/types";

const cellConfigSchema = z.object({
  question: z.string().min(1, "Question cannot be empty"),
  answer: z.string().min(1, "Answer cannot be empty"),
});

const categoryConfigSchema = z.object({
  name: z
    .string()
    .min(1, "Category name cannot be empty")
    .max(40, "Category name must be ≤40 characters"),
  cells: z.array(cellConfigSchema),
});

const boardConfigSchema = z
  .object({
    categories: z
      .array(categoryConfigSchema)
      .min(1, "At least one category required")
      .max(8, "At most 8 categories allowed"),
    pointValues: z
      .array(z.number().int().positive("Point values must be positive"))
      .min(1, "At least one point value required"),
  })
  .refine(
    (board) => {
      // Every category must have cells.length === pointValues.length
      return board.categories.every(
        (cat) => cat.cells.length === board.pointValues.length
      );
    },
    {
      message:
        "Each category must have exactly as many cells as there are pointValues",
    }
  );

const finalQuestionSchema = z.object({
  category: z.string().min(1, "Final category cannot be empty"),
  question: z.string().min(1, "Final question cannot be empty"),
  answer: z.string().min(1, "Final answer cannot be empty"),
});

/**
 * Final round: multiple questions with rising multipliers. Accepts the legacy
 * single-question shape ({category, question, answer}) and upgrades it to a
 * one-question round with multiplier ×1.
 */
const finalConfigSchema = z.preprocess(
  (val) => {
    if (
      val !== null &&
      typeof val === "object" &&
      !("questions" in val) &&
      "question" in val
    ) {
      return { questions: [val] };
    }
    return val;
  },
  z
    .object({
      questions: z
        .array(finalQuestionSchema)
        .min(1, "At least one final question required")
        .max(5, "At most 5 final questions allowed"),
      // Fractional multipliers (e.g. 1.5) are allowed; stakes are rounded to
      // whole pounds at the point of use (see finalStake in lib/format.ts).
      multipliers: z
        .array(z.number().positive("Multipliers must be positive"))
        .optional(),
      wagerFloor: z
        .number()
        .int()
        .nonnegative("wagerFloor must be ≥ 0")
        .default(1000),
    })
    .refine(
      (f) => !f.multipliers || f.multipliers.length === f.questions.length,
      { message: "multipliers must have one entry per final question" }
    )
    .transform((f) => ({
      questions: f.questions,
      // Default multipliers: 1, 2, 3, …
      multipliers: f.multipliers ?? f.questions.map((_, i) => i + 1),
      wagerFloor: f.wagerFloor,
    }))
);

const timersConfigSchema = z
  .object({
    answerSeconds: z
      .number()
      .int()
      .positive("answerSeconds must be positive")
      .max(300, "answerSeconds must be ≤300")
      .default(8),
    // null/omitted = untimed — no countdown or auto-reveal; the admin ends
    // the question manually (Reveal Answer / Skip).
    buzzWindowSeconds: z
      .number()
      .int()
      .positive("buzzWindowSeconds must be positive")
      .max(300, "buzzWindowSeconds must be ≤300")
      .nullable()
      .default(null),
    // null/omitted = untimed — the host ends the answer phase manually.
    finalAnswerSeconds: z
      .number()
      .int()
      .positive("finalAnswerSeconds must be positive")
      .max(300, "finalAnswerSeconds must be ≤300")
      .nullable()
      .default(null),
  })
  .default({
    answerSeconds: 8,
    buzzWindowSeconds: null,
    finalAnswerSeconds: null,
  });

export const gameConfigSchema = z.object({
  title: z.string().default("Jeopardy!"),
  boards: z.array(boardConfigSchema).min(1, "At least one board required"),
  final: finalConfigSchema,
  timers: timersConfigSchema,
}) satisfies z.ZodType<GameConfig>;

/**
 * Parse and validate game config (throws ZodError on invalid input).
 */
export function parseGameConfig(input: unknown): GameConfig {
  return gameConfigSchema.parse(input);
}

/**
 * Parse and validate game config safely. Returns a discriminated union.
 */
export function safeParseGameConfig(
  input: unknown
):
  | { success: true; data: GameConfig }
  | { success: false; error: string } {
  const result = gameConfigSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    // Flatten errors into a readable string
    const formatted = result.error.flatten();
    const fieldErrors = Object.entries(formatted.fieldErrors)
      .map(([key, msgs]) => `${key}: ${(msgs || []).join(", ")}`)
      .join("; ");
    const formErrors = formatted.formErrors.join("; ");
    const errorMessage = [formErrors, fieldErrors]
      .filter((s) => s.length > 0)
      .join("; ");
    return {
      success: false,
      error: errorMessage || "Invalid game config",
    };
  }
}
