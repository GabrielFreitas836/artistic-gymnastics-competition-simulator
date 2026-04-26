import { normalizeState } from "./simulationPersistence";

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
    });

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
    });

    expect(state.finals.apparatusFinals.UB.slots).toEqual([
      {
        competitionOrder: 3,
        qualificationRank: 7,
        qualifiedGymnastId: "gymnast7",
        activeGymnastId: "gymnast7",
      },
    ]);
  });

  it("rebalances legacy mag mixed groups and removes wag-only apparatus data", () => {
    const legacyGroups = Array.from({ length: 8 }, (_, groupIndex) => {
      const groupId = `MG${groupIndex + 1}`;

      return [
        groupId,
        {
          id: groupId,
          name: `Mixed Group ${groupIndex + 1}`,
          gymnasts: Array.from({ length: groupIndex < 4 ? 5 : 4 }, (_, gymnastIndex) => ({
            id: `${groupId}_G${gymnastIndex + 1}`,
            name: `${groupId} Athlete ${gymnastIndex + 1}`,
            countryId: `C${groupIndex}${gymnastIndex}`,
            apparatus: gymnastIndex % 2 === 0 ? ["VT", "UB", "BB", "FX"] : ["UB", "BB"],
            isMixedGroup: true,
            mixedGroupId: groupId,
          })),
        },
      ] as const;
    });

    const state = normalizeState({
      discipline: "MAG",
      teams: {
        BRA: {
          countryId: "BRA",
          gymnasts: [],
        },
      },
      mixedGroups: Object.fromEntries(legacyGroups),
      subdivisions: {
        1: {
          BRA: "FX",
          MG1: "PH",
          MG7: "UB" as never,
        },
        2: {
          MG2: "SR",
          MG8: "BB" as never,
        },
        3: {
          MG3: "VT",
        },
        4: {
          MG4: "FX",
        },
        5: {},
      } as never,
      apparatusOrder: {
        MG1: {
          UB: ["MG1_G1"],
          FX: ["MG1_G2"],
        },
        MG7: {
          BB: ["MG7_G1"],
        },
      } as never,
    });

    expect(Object.keys(state.mixedGroups)).toEqual(["MG1", "MG2", "MG3", "MG4", "MG5", "MG6"]);
    expect(Object.values(state.mixedGroups).every((group) => group.gymnasts.length === 6)).toBe(true);
    expect(
      Object.values(state.mixedGroups).flatMap((group) => group.gymnasts).every((gymnast) =>
        gymnast.apparatus.every((apparatus) => !["UB", "BB"].includes(apparatus)),
      ),
    ).toBe(true);
    expect(
      Object.values(state.mixedGroups).flatMap((group) => group.gymnasts).some((gymnast) =>
        gymnast.apparatus.join(",") === "FX,PH,SR,VT,PB,HB",
      ),
    ).toBe(true);
    expect(state.subdivisions[1]).toEqual({ BRA: "FX", MG1: "PH" });
    expect(state.subdivisions[2]).toEqual({ MG2: "SR" });
    expect(Object.keys(state.subdivisions)).toEqual(["1", "2", "3"]);
    expect(state.apparatusOrder.MG1).toEqual({
      FX: ["MG1_G2", "MG1_G1", "MG1_G3", "MG1_G4", "MG1_G5", "MG2_G1"],
      PH: ["MG1_G2", "MG1_G4"],
      SR: ["MG1_G2", "MG1_G4"],
      VT: ["MG1_G1", "MG1_G2", "MG1_G3", "MG1_G4", "MG1_G5", "MG2_G1"],
      PB: ["MG1_G2", "MG1_G4"],
      HB: ["MG1_G2", "MG1_G4"],
    });
    expect(state.apparatusOrder.MG7).toBeUndefined();
  });
});
