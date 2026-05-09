import { OlympicRosterEntry, QuotaAward, QuotaLedgerEntry } from "./types";

const buildAwardIdentity = (award: QuotaAward): string =>
  [
    award.cycleId,
    award.competitionRunId,
    award.discipline,
    award.countryId,
    award.gymnastId || "",
    award.apparatus || "",
    award.reason,
    award.position ?? "",
    award.isNominative ? "n" : "nn",
  ].join(":");

export const aggregateQuotaLedger = (
  cycleId: string,
  awards: QuotaAward[],
): QuotaLedgerEntry[] => {
  const seen = new Set<string>();
  const byCountry = new Map<string, QuotaLedgerEntry>();

  awards.forEach((award) => {
    if (award.cycleId !== cycleId) {
      return;
    }

    const identity = buildAwardIdentity(award);
    if (seen.has(identity)) {
      return;
    }
    seen.add(identity);

    const key = `${award.discipline}:${award.countryId}`;
    const existing = byCountry.get(key) || {
      cycleId,
      discipline: award.discipline,
      countryId: award.countryId,
      nominativeGymnastIds: [],
      nonNominativeCount: 0,
      awards: [],
    };

    existing.awards.push(award);

    if (award.isNominative && award.gymnastId) {
      if (!existing.nominativeGymnastIds.includes(award.gymnastId)) {
        existing.nominativeGymnastIds.push(award.gymnastId);
      }
    } else if (!award.isNominative) {
      existing.nonNominativeCount += 1;
    }

    byCountry.set(key, existing);
  });

  return [...byCountry.values()].sort((left, right) => {
    if (left.discipline !== right.discipline) {
      return left.discipline.localeCompare(right.discipline);
    }

    return left.countryId.localeCompare(right.countryId);
  });
};

export const buildOlympicRosterEntries = (
  ledger: QuotaLedgerEntry[],
): OlympicRosterEntry[] =>
  ledger.map((entry) => ({
    discipline: entry.discipline,
    countryId: entry.countryId,
    nominativeGymnastIds: [...entry.nominativeGymnastIds],
    nonNominativeCount: entry.nonNominativeCount,
    totalQuotaSlots: entry.nominativeGymnastIds.length + entry.nonNominativeCount,
    awards: [...entry.awards],
  }));
