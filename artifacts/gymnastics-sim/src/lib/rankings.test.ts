import { describe, expect, it } from "vitest";

import {
  getEventFinalRankings,
  getRelativeTeamRankingsForSubdivision,
  isTeamQualificationComplete,
} from "./rankings";
import { Apparatus, DnsMap, Gymnast, ScoreMap, Team } from "./types";

const createVaultGymnast = (
  id: string,
  name: string,
  apparatus: Gymnast["apparatus"],
): Gymnast => ({
  id,
  name,
  countryId: "BRA",
  apparatus,
});

describe("getEventFinalRankings", () => {
  it("keeps single-vault gymnasts out of the VT qualification ranking", () => {
    const allGymnasts: Gymnast[] = [
      createVaultGymnast("vt_single", "Single Vault", ["VT"]),
      createVaultGymnast("vt_double", "Double Vault", ["VT*"]),
    ];
    const scores: ScoreMap = {
      vt_single: {
        VT: { d: 5.0, e: 8.6, penalty: 0, total: 13.6 },
      },
      vt_double: {
        "VT*": [
          { d: 5.1, e: 8.5, penalty: 0, total: 13.6 },
          { d: 5.2, e: 8.6, penalty: 0, total: 13.8 },
        ],
      },
    };

    const rankings = getEventFinalRankings(allGymnasts, "VT", scores, {});

    expect(rankings.map((row) => row.gymnast.id)).toEqual(["vt_double"]);
    expect(rankings[0].total).toBe(13.7);
  });

  it("still allows VT* titulares to rank while excluding single-vault teammates", () => {
    const team: Team = {
      countryId: "BRA",
      rosterFormat: 5,
      gymnasts: [
        {
          id: "team_vt_single",
          name: "Team Single",
          countryId: "BRA",
          apparatus: ["VT"],
          teamAssignments: { VT: "titular" },
        },
        {
          id: "team_vt_double",
          name: "Team Double",
          countryId: "BRA",
          apparatus: ["VT*"],
          teamAssignments: { VT: "titular" },
        },
      ],
    };
    const scores: ScoreMap = {
      team_vt_single: {
        VT: { d: 5.0, e: 8.4, penalty: 0, total: 13.4 },
      },
      team_vt_double: {
        "VT*": [
          { d: 5.2, e: 8.5, penalty: 0, total: 13.7 },
          { d: 5.1, e: 8.6, penalty: 0, total: 13.7 },
        ],
      },
    };

    const rankings = getEventFinalRankings(
      team.gymnasts,
      "VT",
      scores,
      {},
      { BRA: team },
      {},
    );

    expect(rankings.map((row) => row.gymnast.id)).toEqual(["team_vt_double"]);
    expect(rankings[0].status).toBe("Q");
  });
});

const createTeamGymnast = (
  id: string,
  countryId: string,
  totals: Partial<Record<"VT" | "UB" | "BB" | "FX" | "PH" | "SR" | "PB" | "HB", number>>,
): Gymnast => ({
  id,
  name: id,
  countryId,
  apparatus: Object.keys(totals) as Gymnast["apparatus"],
});

const createScoreMap = (
  entries: Array<{ gymnastId: string; totals: Partial<Record<string, number>> }>,
): ScoreMap =>
  entries.reduce<ScoreMap>((accumulator, { gymnastId, totals }) => {
    accumulator[gymnastId] = Object.entries(totals).reduce<ScoreMap[string]>(
      (scoreAccumulator, [apparatus, total]) => {
        (scoreAccumulator as Record<string, unknown>)[apparatus as Apparatus] = {
          d: 5,
          e: Number(total) - 5,
          penalty: 0,
          total: Number(total),
        };
        return scoreAccumulator;
      },
      {},
    );
    return accumulator;
  }, {});

describe("getRelativeTeamRankingsForSubdivision", () => {
  it("shows cumulative WAG team standings rotation by rotation within the selected subdivision", () => {
    const teams: Record<string, Team> = {
      BRA: {
        countryId: "BRA",
        gymnasts: [
          createTeamGymnast("bra-1", "BRA", { VT: 13.2, UB: 12.8, BB: 13.0, FX: 12.0 }),
          createTeamGymnast("bra-2", "BRA", { VT: 13.1, UB: 12.7, BB: 13.0, FX: 12.0 }),
          createTeamGymnast("bra-3", "BRA", { VT: 13.0, UB: 12.6, BB: 13.0, FX: 12.0 }),
        ],
      },
      CHN: {
        countryId: "CHN",
        gymnasts: [
          createTeamGymnast("chn-1", "CHN", { UB: 13.0, BB: 13.1, FX: 12.9, VT: 12.8 }),
          createTeamGymnast("chn-2", "CHN", { UB: 13.0, BB: 13.1, FX: 12.9, VT: 12.8 }),
          createTeamGymnast("chn-3", "CHN", { UB: 13.0, BB: 13.1, FX: 12.9, VT: 12.8 }),
        ],
      },
      USA: {
        countryId: "USA",
        gymnasts: [
          createTeamGymnast("usa-1", "USA", { BB: 13.4, FX: 13.1, VT: 13.0, UB: 12.9 }),
          createTeamGymnast("usa-2", "USA", { BB: 13.3, FX: 13.1, VT: 13.0, UB: 12.8 }),
          createTeamGymnast("usa-3", "USA", { BB: 13.2, FX: 13.1, VT: 13.0, UB: 12.7 }),
        ],
      },
    };

    const scores = createScoreMap([
      {
        gymnastId: "bra-1",
        totals: { VT: 13.2, UB: 12.8, BB: 13.0, FX: 12.0 },
      },
      {
        gymnastId: "bra-2",
        totals: { VT: 13.1, UB: 12.7, BB: 13.0, FX: 12.0 },
      },
      {
        gymnastId: "bra-3",
        totals: { VT: 13.0, UB: 12.6, BB: 13.0, FX: 12.0 },
      },
      {
        gymnastId: "chn-1",
        totals: { UB: 13.0, BB: 13.1, FX: 12.9, VT: 12.8 },
      },
      {
        gymnastId: "chn-2",
        totals: { UB: 13.0, BB: 13.1, FX: 12.9, VT: 12.8 },
      },
      {
        gymnastId: "chn-3",
        totals: { UB: 13.0, BB: 13.1, FX: 12.9, VT: 12.8 },
      },
      {
        gymnastId: "usa-1",
        totals: { BB: 13.4, FX: 13.1, VT: 13.0, UB: 12.9 },
      },
      {
        gymnastId: "usa-2",
        totals: { BB: 13.3, FX: 13.1, VT: 13.0, UB: 12.8 },
      },
      {
        gymnastId: "usa-3",
        totals: { BB: 13.2, FX: 13.1, VT: 13.0, UB: 12.7 },
      },
    ]);

    const subdivisions = {
      1: { BRA: "VT", CHN: "UB" },
      2: { USA: "BB" },
      3: {},
      4: {},
      5: {},
    } as const;

    const rotation1 = getRelativeTeamRankingsForSubdivision(
      teams,
      subdivisions,
      scores,
      {},
      "WAG",
      1,
      1,
    );
    const rotation2 = getRelativeTeamRankingsForSubdivision(
      teams,
      subdivisions,
      scores,
      {},
      "WAG",
      1,
      2,
    );

    expect(rotation1.map((row) => row.team.countryId)).toEqual(["BRA", "CHN"]);
    expect(rotation1.map((row) => row.total)).toEqual([39.3, 39]);
    expect(rotation2.map((row) => row.team.countryId)).toEqual(["CHN", "BRA"]);
    expect(rotation2.map((row) => row.total)).toEqual([78.3, 77.4]);
  });

  it("includes teams from previous subdivisions and truncates everyone to the same rotation", () => {
    const teams: Record<string, Team> = {
      BRA: {
        countryId: "BRA",
        gymnasts: [
          createTeamGymnast("bra-1", "BRA", { VT: 13.2, UB: 12.8, BB: 13.0, FX: 12.0 }),
          createTeamGymnast("bra-2", "BRA", { VT: 13.1, UB: 12.7, BB: 13.0, FX: 12.0 }),
          createTeamGymnast("bra-3", "BRA", { VT: 13.0, UB: 12.6, BB: 13.0, FX: 12.0 }),
        ],
      },
      CHN: {
        countryId: "CHN",
        gymnasts: [
          createTeamGymnast("chn-1", "CHN", { UB: 13.0, BB: 13.1, FX: 12.9, VT: 12.8 }),
          createTeamGymnast("chn-2", "CHN", { UB: 13.0, BB: 13.1, FX: 12.9, VT: 12.8 }),
          createTeamGymnast("chn-3", "CHN", { UB: 13.0, BB: 13.1, FX: 12.9, VT: 12.8 }),
        ],
      },
      USA: {
        countryId: "USA",
        gymnasts: [
          createTeamGymnast("usa-1", "USA", { BB: 13.4, FX: 13.1, VT: 13.0, UB: 12.9 }),
          createTeamGymnast("usa-2", "USA", { BB: 13.3, FX: 13.1, VT: 13.0, UB: 12.8 }),
          createTeamGymnast("usa-3", "USA", { BB: 13.2, FX: 13.1, VT: 13.0, UB: 12.7 }),
        ],
      },
    };

    const scores = createScoreMap([
      {
        gymnastId: "bra-1",
        totals: { VT: 13.2, UB: 12.8, BB: 13.0, FX: 12.0 },
      },
      {
        gymnastId: "bra-2",
        totals: { VT: 13.1, UB: 12.7, BB: 13.0, FX: 12.0 },
      },
      {
        gymnastId: "bra-3",
        totals: { VT: 13.0, UB: 12.6, BB: 13.0, FX: 12.0 },
      },
      {
        gymnastId: "chn-1",
        totals: { UB: 13.0, BB: 13.1, FX: 12.9, VT: 12.8 },
      },
      {
        gymnastId: "chn-2",
        totals: { UB: 13.0, BB: 13.1, FX: 12.9, VT: 12.8 },
      },
      {
        gymnastId: "chn-3",
        totals: { UB: 13.0, BB: 13.1, FX: 12.9, VT: 12.8 },
      },
      {
        gymnastId: "usa-1",
        totals: { BB: 13.4, FX: 13.1, VT: 13.0, UB: 12.9 },
      },
      {
        gymnastId: "usa-2",
        totals: { BB: 13.3, FX: 13.1, VT: 13.0, UB: 12.8 },
      },
      {
        gymnastId: "usa-3",
        totals: { BB: 13.2, FX: 13.1, VT: 13.0, UB: 12.7 },
      },
    ]);

    const subdivisions = {
      1: { BRA: "VT", CHN: "UB" },
      2: { USA: "BB" },
      3: {},
      4: {},
      5: {},
    } as const;

    const rotation1 = getRelativeTeamRankingsForSubdivision(
      teams,
      subdivisions,
      scores,
      {},
      "WAG",
      2,
      1,
    );
    const rotation2 = getRelativeTeamRankingsForSubdivision(
      teams,
      subdivisions,
      scores,
      {},
      "WAG",
      2,
      2,
    );

    expect(rotation1.map((row) => row.team.countryId)).toEqual(["USA", "BRA", "CHN"]);
    expect(rotation1.map((row) => row.total)).toEqual([39.9, 39.3, 39]);
    expect(rotation2.map((row) => row.team.countryId)).toEqual(["USA", "CHN", "BRA"]);
    expect(rotation2.map((row) => row.total)).toEqual([79.2, 78.3, 77.4]);
  });

  it("uses the full MAG rotation count when the selected rotation reaches six", () => {
    const teams: Record<string, Team> = {
      JPN: {
        countryId: "JPN",
        gymnasts: [
          createTeamGymnast("jpn-1", "JPN", { FX: 12, PH: 11, SR: 12, VT: 13, PB: 12, HB: 11 }),
          createTeamGymnast("jpn-2", "JPN", { FX: 12, PH: 11, SR: 12, VT: 13, PB: 12, HB: 11 }),
          createTeamGymnast("jpn-3", "JPN", { FX: 12, PH: 11, SR: 12, VT: 13, PB: 12, HB: 11 }),
        ],
      },
    };

    const scores = createScoreMap([
      {
        gymnastId: "jpn-1",
        totals: { FX: 12, PH: 11, SR: 12, VT: 13, PB: 12, HB: 11 },
      },
      {
        gymnastId: "jpn-2",
        totals: { FX: 12, PH: 11, SR: 12, VT: 13, PB: 12, HB: 11 },
      },
      {
        gymnastId: "jpn-3",
        totals: { FX: 12, PH: 11, SR: 12, VT: 13, PB: 12, HB: 11 },
      },
    ]);

    const rankings = getRelativeTeamRankingsForSubdivision(
      teams,
      { 1: { JPN: "FX" }, 2: {}, 3: {} },
      scores,
      {},
      "MAG",
      1,
      6,
    );

    expect(rankings).toHaveLength(1);
    expect(rankings[0].total).toBe(213);
  });

  it("ignores future-apparatus DNS and scores until that rotation is reached", () => {
    const team: Team = {
      countryId: "BRA",
      gymnasts: [
        createTeamGymnast("bra-1", "BRA", { VT: 13.2, UB: 12.8 }),
        createTeamGymnast("bra-2", "BRA", { VT: 13.1, UB: 12.7 }),
        createTeamGymnast("bra-3", "BRA", { VT: 13.0, UB: 12.6 }),
      ],
    };
    const scores = createScoreMap([
      { gymnastId: "bra-1", totals: { VT: 13.2, UB: 12.8 } },
      { gymnastId: "bra-2", totals: { VT: 13.1, UB: 12.7 } },
      { gymnastId: "bra-3", totals: { VT: 13.0, UB: 12.6 } },
    ]);
    const dns: DnsMap = {
      "bra-1": { UB: true },
      "bra-2": { UB: true },
      "bra-3": { UB: true },
    };

    const rankings = getRelativeTeamRankingsForSubdivision(
      { BRA: team },
      { 1: { BRA: "VT" }, 2: {}, 3: {}, 4: {}, 5: {} },
      scores,
      dns,
      "WAG",
      1,
      1,
    );

    expect(rankings[0].resultState).toBe("OK");
    expect(rankings[0].total).toBe(39.3);
  });
});

describe("isTeamQualificationComplete", () => {
  it("only returns true when every team has finished its full qualification total", () => {
    const teams: Record<string, Team> = {
      BRA: {
        countryId: "BRA",
        gymnasts: [
          createTeamGymnast("bra-1", "BRA", { VT: 13, UB: 12, BB: 12, FX: 12 }),
          createTeamGymnast("bra-2", "BRA", { VT: 13, UB: 12, BB: 12, FX: 12 }),
          createTeamGymnast("bra-3", "BRA", { VT: 13, UB: 12, BB: 12, FX: 12 }),
        ],
      },
      CHN: {
        countryId: "CHN",
        gymnasts: [
          createTeamGymnast("chn-1", "CHN", { VT: 13, UB: 12, BB: 12, FX: 12 }),
          createTeamGymnast("chn-2", "CHN", { VT: 13, UB: 12, BB: 12, FX: 12 }),
          createTeamGymnast("chn-3", "CHN", { VT: 13, UB: 12, BB: 12, FX: 12 }),
        ],
      },
    };

    const incompleteScores = createScoreMap([
      { gymnastId: "bra-1", totals: { VT: 13, UB: 12, BB: 12, FX: 12 } },
      { gymnastId: "bra-2", totals: { VT: 13, UB: 12, BB: 12, FX: 12 } },
      { gymnastId: "bra-3", totals: { VT: 13, UB: 12, BB: 12, FX: 12 } },
      { gymnastId: "chn-1", totals: { VT: 13 } },
      { gymnastId: "chn-2", totals: { VT: 13 } },
      { gymnastId: "chn-3", totals: { VT: 13 } },
    ]);
    const completeScores = createScoreMap([
      { gymnastId: "bra-1", totals: { VT: 13, UB: 12, BB: 12, FX: 12 } },
      { gymnastId: "bra-2", totals: { VT: 13, UB: 12, BB: 12, FX: 12 } },
      { gymnastId: "bra-3", totals: { VT: 13, UB: 12, BB: 12, FX: 12 } },
      { gymnastId: "chn-1", totals: { VT: 13, UB: 12, BB: 12, FX: 12 } },
      { gymnastId: "chn-2", totals: { VT: 13, UB: 12, BB: 12, FX: 12 } },
      { gymnastId: "chn-3", totals: { VT: 13, UB: 12, BB: 12, FX: 12 } },
    ]);

    expect(isTeamQualificationComplete(teams, incompleteScores, {}, "WAG")).toBe(false);
    expect(isTeamQualificationComplete(teams, completeScores, {}, "WAG")).toBe(true);
  });
});
