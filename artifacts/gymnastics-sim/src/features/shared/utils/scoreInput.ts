export type ScoreField = "d" | "e" | "penalty";

const MAX_EXECUTION_SCORE = 10;

export interface NormalizedScoreInput {
  numericValue: number;
  formattedValue: string;
}

export const formatScoreField = (value: number): string => value.toFixed(3);

const clampExecutionScoreInput = (value: string, field: ScoreField): string => {
  if (field !== "e") {
    return value;
  }

  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed) || parsed <= MAX_EXECUTION_SCORE) {
    return value;
  }

  return formatScoreField(MAX_EXECUTION_SCORE);
};

export const sanitizeScoreInput = (raw: string, field: ScoreField): string => {
  if (raw === "") return "";

  const normalized = raw.replace(/,/g, ".").replace(/[^0-9.]/g, "");
  const startsWithDot = normalized.startsWith(".");
  const [integerPartRaw = "", ...decimalParts] = normalized.split(".");
  const integerPart = startsWithDot ? "0" : integerPartRaw;
  const decimalPart = decimalParts.join("").slice(0, 3);

  if (normalized.includes(".")) {
    return clampExecutionScoreInput(`${integerPart}.${decimalPart}`, field);
  }

  return clampExecutionScoreInput(integerPart, field);
};

export const normalizeScoreInput = (raw: string, field: ScoreField): NormalizedScoreInput | null => {
  if (raw.trim() === "") return null;

  const parsed = Number.parseFloat(raw);
  if (Number.isNaN(parsed)) return null;

  const numericValue = Number(
    Math.min(field === "e" ? MAX_EXECUTION_SCORE : Number.POSITIVE_INFINITY, parsed).toFixed(3),
  );
  return {
    numericValue,
    formattedValue: formatScoreField(numericValue),
  };
};

export const buildScoreDraftKey = (...parts: Array<string | number | undefined>): string =>
  parts.filter((part): part is string | number => part !== undefined).join("__");
