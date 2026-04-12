import { Team } from "@/lib/types";
import { SimulationState } from "@/lib/types";

import { getGymnastMedalSummary } from "./summary";

const TEAM_ORDER = ["BRA", "USA", "CHN", "ITA", "FRA", "JPN", "GBR", "CAN"] as const;

const createScore = (total: number) => ({
  d: 5,
  e: total - 5,
  penalty: 0,
  total,
});

const createTeam = (
  countryId: string,
  prefix: string,
  gymnastCount = 3,
): Team => ({
  countryId,
  gymnasts: Array.from({ length: gymnastCount }, (_, index) => ({
    id: `${prefix}${index + 1}`,
    name: `${prefix.toUpperCase()} ${index + 1}`,
    countryId,
    apparatus: ["VT", "UB", "BB", "FX"],
  })),
});

const createBaseState = (): SimulationState => {
  const teams: SimulationState["teams"] = {
    BRA: createTeam("BRA", "bra", 4),
    USA: createTeam("USA", "usa"),
    CHN: createTeam("CHN", "chn"),
    ITA: createTeam("ITA", "ita"),
    FRA: createTeam("FRA", "fra"),
    JPN: createTeam("JPN", "jpn"),
    GBR: createTeam("GBR", "gbr"),
    CAN: createTeam("CAN", "can"),
  };

  const teamFinalLineups = Object.fromEntries(
    Object.values(teams).map((team) => {
      const lineupIds = team.gymnasts.slice(0, 3).map((gymnast) => gymnast.id);
      return [
        team.countryId,
        {
          VT: lineupIds,
          UB: lineupIds,
          BB: lineupIds,
          FX: lineupIds,
        },
      ];
    }),
  );

  const baseTotalsByCountryId: Record<string, number> = {
    BRA: 13,
    USA: 12,
    CHN: 11,
    ITA: 10,
    FRA: 9,
    JPN: 8,
    GBR: 7,
    CAN: 6,
  };

  const teamFinalScores = Object.values(teams).reduce<SimulationState["finals"]["teamFinal"]["scores"]>(
    (accumulator, team) => {
      const total = baseTotalsByCountryId[team.countryId];
      team.gymnasts.slice(0, 3).forEach((gymnast) => {
        accumulator[gymnast.id] = {
          VT: createScore(total),
          UB: createScore(total),
          BB: createScore(total),
          FX: createScore(total),
        };
      });

      return accumulator;
    },
    {},
  );

  return {
    phase: 7,
    selectedCountries: [],
    teams,
    mixedGroups: {},
    subdivisions: { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} },
    scores: {},
    dns: {},
    apparatusOrder: {},
    finals: {
      teamFinal: {
        slots: TEAM_ORDER.map((countryId, index) => ({
          seedRank: index + 1,
          qualifiedTeamId: countryId,
          activeTeamId: countryId,
        })),
        lineups: teamFinalLineups,
        scores: teamFinalScores,
        dns: {},
      },
      allAroundFinal: {
        slots: [],
        scores: {},
        dns: {},
      },
      apparatusFinals: {
        VT: { slots: [], scores: {}, dns: {} },
        UB: {
          slots: [{ competitionOrder: 1, qualificationRank: 1, gymnastId: "bra1" }],
          scores: {
            bra1: {
              UB: createScore(14.5),
            },
          },
          dns: {},
        },
        BB: { slots: [], scores: {}, dns: {} },
        FX: { slots: [], scores: {}, dns: {} },
      },
    },
  };
};

describe("getGymnastMedalSummary", () => {
  it("includes medal-winning team rosters and aggregates team plus individual medals", () => {
    const summary = getGymnastMedalSummary(createBaseState());

    expect(summary).toHaveLength(10);
    expect(summary[0]).toMatchObject({
      gymnastId: "bra1",
      gymnastName: "BRA 1",
      countryId: "BRA",
      totalCount: 2,
      goldCount: 2,
      silverCount: 0,
      bronzeCount: 0,
    });
    expect(summary[0].medals).toEqual([
      { medal: "Gold", eventKey: "TEAM", eventLabel: "Team Final" },
      { medal: "Gold", eventKey: "UB", eventLabel: "Uneven Bars Final" },
    ]);

    const bra4 = summary.find((entry) => entry.gymnastId === "bra4");
    expect(bra4).toMatchObject({
      gymnastId: "bra4",
      gymnastName: "BRA 4",
      countryId: "BRA",
      totalCount: 1,
      goldCount: 1,
      silverCount: 0,
      bronzeCount: 0,
    });
    expect(bra4?.medals).toEqual([
      { medal: "Gold", eventKey: "TEAM", eventLabel: "Team Final" },
    ]);

    expect(summary.map((entry) => entry.gymnastId).slice(0, 4)).toEqual([
      "bra1",
      "bra2",
      "bra3",
      "bra4",
    ]);
    expect(summary.some((entry) => entry.gymnastId === "usa1")).toBe(true);
    expect(summary.some((entry) => entry.gymnastId === "chn1")).toBe(true);
  });
});
