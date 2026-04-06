export type ScoreField = "d" | "e" | "penalty";

export interface NormalizedScoreInput {
  numericValue: number;
  formattedValue: string;
}

export const formatScoreField = (value: number): string => value.toFixed(3);

export const sanitizeScoreInput = (raw: string): string => {
  if (raw === "") return "";

  const normalized = raw.replace(/,/g, ".").replace(/[^0-9.]/g, "");
  const startsWithDot = normalized.startsWith(".");
  const [integerPartRaw = "", ...decimalParts] = normalized.split(".");
  const integerPart = startsWithDot ? "0" : integerPartRaw;
  const decimalPart = decimalParts.join("").slice(0, 3);

  if (normalized.includes(".")) {
    return `${integerPart}.${decimalPart}`;
  }

  return integerPart;
};

export const normalizeScoreInput = (raw: string): NormalizedScoreInput | null => {
  if (raw.trim() === "") return null;

  const parsed = Number.parseFloat(raw);
  if (Number.isNaN(parsed)) return null;

  const numericValue = Number(parsed.toFixed(3));
  return {
    numericValue,
    formattedValue: formatScoreField(numericValue),
  };
};

export const buildScoreDraftKey = (...parts: Array<string | number | undefined>): string =>
  parts.filter((part): part is string | number => part !== undefined).join("__");
