import { describe, expect, it } from "vitest";

import { normalizeState, type PersistedState } from "./simulationPersistence";

describe("normalizeState", () => {
  it("strips legacy __touched metadata from persisted scores", () => {
    const state = normalizeState({
      scores: {
        gymnast1: {
          UB: {
            d: 5.2,
            e: 8.1,
            penalty: 0.3,
            total: 13,
            __touched: { d: true },
          },
        },
      },
      finals: {
        allAroundFinal: {
          slots: [],
          dns: {},
          scores: {
            gymnast1: {
              VT: {
                d: 5,
                e: 8.5,
                penalty: 0,
                total: 13.5,
                __touched: { e: true },
              },
            },
          },
        },
      },
    } as unknown as PersistedState);

    expect(state.scores.gymnast1?.UB).toEqual({
      d: 5.2,
      e: 8.1,
      penalty: 0.3,
      total: 13,
    });
    expect(state.finals.allAroundFinal.scores.gymnast1?.VT).toEqual({
      d: 5,
      e: 8.5,
      penalty: 0,
      total: 13.5,
    });
  });

  it("migrates legacy apparatus final slots that only stored gymnastId", () => {
    const state = normalizeState({
      finals: {
        apparatusFinals: {
          UB: {
            slots: [
              {
                competitionOrder: 3,
                qualificationRank: 7,
                gymnastId: "gymnast7",
              } as never,
            ],
          },
        },
      },
    } as unknown as PersistedState);

    expect(state.finals.apparatusFinals.UB.slots).toEqual([
      {
        competitionOrder: 3,
        qualificationRank: 7,
        qualifiedGymnastId: "gymnast7",
        activeGymnastId: "gymnast7",
      },
    ]);
  });

  it("derives team assignments from persisted teams and sanitizes standby usage", () => {
    const state = normalizeState({
      discipline: "WAG",
      teams: {
        BRA: {
          countryId: "BRA",
          gymnasts: [
            { id: "b1", name: "B1", countryId: "BRA", apparatus: ["VT*", "UB", "BB", "FX"] },
            { id: "b2", name: "B2", countryId: "BRA", apparatus: ["VT", "UB", "BB", "FX"] },
            { id: "b3", name: "B3", countryId: "BRA", apparatus: ["VT", "UB", "BB", "FX"] },
            {
              id: "b4",
              name: "B4",
              countryId: "BRA",
              apparatus: ["VT", "UB"],
              teamAssignments: { FX: "standby" },
            },
            {
              id: "b5",
              name: "B5",
              countryId: "BRA",
              apparatus: [],
              teamAssignments: { UB: "standby" },
            },
          ],
        },
      },
      qualificationStandByUsage: {
        BRA: {
          UB: { standbyGymnastId: "b5", activated: true },
          FX: { standbyGymnastId: "b4", activated: true },
        },
      },
    } as unknown as PersistedState);

    expect(state.teams.BRA.rosterFormat).toBe(5);
    expect(state.teams.BRA.gymnasts[0].teamAssignments?.VT).toBe("titular");
    expect(state.teams.BRA.gymnasts[4].teamAssignments?.UB).toBe("standby");
    expect(state.teams.BRA.gymnasts[3].teamAssignments?.FX).toBe("inactive");
    expect(state.qualificationStandByUsage).toEqual({
      BRA: {
        UB: { standbyGymnastId: "b5", activated: true },
      },
    });
  });
});
