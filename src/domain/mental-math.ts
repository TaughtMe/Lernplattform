export type MentalMathOperation = "add" | "subtract" | "multiply" | "divide";

export type MentalMathTask = {
  id: string;
  prompt: string;
  answer: number;
  skillId: string;
};

export type MentalMathOptions = {
  operations: readonly MentalMathOperation[];
  maxValue: number;
  count: number;
};

const symbol: Record<MentalMathOperation, string> = {
  add: "+",
  subtract: "−",
  multiply: "·",
  divide: ":",
};

function integer(random: () => number, min: number, max: number) {
  return min + Math.floor(random() * (max - min + 1));
}

function operands(
  operation: MentalMathOperation,
  maxValue: number,
  random: () => number,
) {
  if (operation === "add") {
    const left = integer(random, 0, maxValue);
    const right = integer(random, 0, maxValue - left);
    return [left, right, left + right] as const;
  }
  if (operation === "subtract") {
    const left = integer(random, 0, maxValue);
    const right = integer(random, 0, left);
    return [left, right, left - right] as const;
  }
  if (operation === "multiply") {
    const left = integer(random, 1, Math.min(10, maxValue));
    const right = integer(random, 0, Math.min(10, Math.floor(maxValue / left)));
    return [left, right, left * right] as const;
  }
  const right = integer(random, 1, Math.min(10, maxValue));
  const result = integer(random, 0, Math.min(10, Math.floor(maxValue / right)));
  return [right * result, right, result] as const;
}

export function generateMentalMathTasks(
  options: MentalMathOptions,
  random: () => number = Math.random,
): MentalMathTask[] {
  const operations: readonly MentalMathOperation[] = options.operations.length
    ? options.operations
    : ["add"];
  const maxValue = Math.max(1, Math.floor(options.maxValue));
  const count = Math.max(1, Math.floor(options.count));

  return Array.from({ length: count }, (_, index) => {
    const operation =
      operations[integer(random, 0, operations.length - 1)] ??
      operations[0] ??
      "add";
    const [left, right, answer] = operands(operation, maxValue, random);
    return {
      id: `math-${index}-${operation}-${left}-${right}`,
      prompt: `${left} ${symbol[operation]} ${right}`,
      answer,
      skillId: `math:${operation}:range-${maxValue}`,
    };
  });
}

export function checkMentalMathAnswer(task: MentalMathTask, value: string) {
  const normalized = value.trim().replace(",", ".");
  return normalized !== "" && Number(normalized) === task.answer;
}
