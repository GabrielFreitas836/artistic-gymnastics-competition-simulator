export const formatOrdinal = (value: number | null): string => {
  if (value === null) return "-";

  const mod10 = value % 10;
  const mod100 = value % 100;

  if (mod10 === 1 && mod100 !== 11) return `${value}st`;
  if (mod10 === 2 && mod100 !== 12) return `${value}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${value}rd`;
  return `${value}th`;
};

export const formatOptionalScore = (
  value: number | null | undefined,
  emptyValue = "-",
): string => (value === null || value === undefined ? emptyValue : value.toFixed(3));
