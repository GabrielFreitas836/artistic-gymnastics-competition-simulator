import { describe, expect, it } from "vitest";

import { getApparatusForDiscipline } from "./competition";
import { generateQuickSetupSnapshot, validateQuickSetupSnapshot } from "./quickSetup";
import { getTeamAssignmentStatus } from "./teamRoster";

const createSeededRng = (initialSeed: number) => {
  let seed = initialSeed >>> 0;

  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x1_0000_0000;
  };
};

const createFetchStub = (): typeof fetch =>
  (async (input: RequestInfo | URL) => {
    const url = new URL(typeof input === "string" ? input : input.toString());
    const count = Number(url.searchParams.get("results") || "0");
    const nat = url.searchParams.get("nat") || "XX";

    return {
      ok: true,
      json: async () => ({
        results: Array.from({ length: count }, (_, index) => ({
          name: {
            first: `Athlete${index + 1}`,
            last: nat,
          },
        })),
      }),
    } as Response;
  }) as typeof fetch;

describe("generateQuickSetupSnapshot", () => {
  it("creates mixed 3-member and 5-member teams with normalized standby rules", async () => {
    const snapshot = await generateQuickSetupSnapshot({
      discipline: "WAG",
      fetchImpl: createFetchStub(),
      rng: createSeededRng(42),
    });

    validateQuickSetupSnapshot(snapshot);

    const officialApparatus = getApparatusForDiscipline("WAG");
    const teams = Object.values(snapshot.teams);
    const reducedTeams = teams.filter((team) => team.rosterFormat === 3);
    const standardTeams = teams.filter((team) => (team.rosterFormat || 5) === 5);

    expect(reducedTeams).toHaveLength(3);
    expect(standardTeams).toHaveLength(9);
    expect(snapshot.qualificationStandByUsage).toEqual({});

    reducedTeams.forEach((team) => {
      const doubleVaultCount = team.gymnasts
        .slice(0, 3)
        .filter((gymnast) => gymnast.apparatus.includes("VT*")).length;

      expect(doubleVaultCount).toBeGreaterThanOrEqual(1);
      expect(doubleVaultCount).toBeLessThanOrEqual(3);

      officialApparatus.forEach((apparatus) => {
        const titularCount = team.gymnasts.filter(
          (gymnast) => getTeamAssignmentStatus(gymnast, apparatus) === "titular",
        ).length;
        const standByCount = team.gymnasts.filter(
          (gymnast) => getTeamAssignmentStatus(gymnast, apparatus) === "standby",
        ).length;

        expect(titularCount).toBe(3);
        expect(standByCount).toBe(0);
      });
    });

    standardTeams.forEach((team) => {
      officialApparatus.forEach((apparatus) => {
        const titularCount = team.gymnasts.filter(
          (gymnast) => getTeamAssignmentStatus(gymnast, apparatus) === "titular",
        ).length;
        const standByCount = team.gymnasts.filter(
          (gymnast) => getTeamAssignmentStatus(gymnast, apparatus) === "standby",
        ).length;
        const orderedIds = snapshot.apparatusOrder[team.countryId]?.[apparatus] || [];

        expect(titularCount).toBeGreaterThanOrEqual(3);
        expect(titularCount).toBeLessThanOrEqual(4);
        expect(standByCount).toBeLessThanOrEqual(1);
        expect(orderedIds).toHaveLength(titularCount);

        if (standByCount === 1) {
          expect(titularCount).toBe(4);
        }
      });
    });
  });
});
