import { getAllAroundFinalRankings } from "./selectors";
import { SimulationState } from "@/lib/types";

const createBaseState = (): SimulationState => ({
  phase: 7,
  selectedCountries: [],
  teams: {
    BRA: {
      countryId: "BRA",
      gymnasts: [
        {
          id: "g1",
          name: "Ana Silva",
          countryId: "BRA",
          apparatus: ["VT", "UB", "BB", "FX"],
        },
      ],
    },
  },
  mixedGroups: {},
  subdivisions: { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} },
  scores: {},
  dns: {},
  apparatusOrder: {},
  finals: {
    teamFinal: {
      slots: [],
      lineups: {},
      scores: {},
      dns: {},
    },
    allAroundFinal: {
      slots: [
        {
          slotNumber: 1,
          qualificationRank: 1,
          qualifiedGymnastId: "g1",
          activeGymnastId: "g1",
        },
      ],
      scores: {
        g1: {
          VT: { d: 5.2, e: 8.6, penalty: 0, total: 13.8 },
          BB: { d: 5.1, e: 8.3, penalty: 0, total: 13.4 },
          FX: { d: 5.4, e: 8.2, penalty: 0, total: 13.6 },
        },
      },
      dns: {
        g1: {
          UB: true,
        },
      },
    },
    apparatusFinals: {
      VT: { slots: [], scores: {}, dns: {} },
      UB: { slots: [], scores: {}, dns: {} },
      BB: { slots: [], scores: {}, dns: {} },
      FX: { slots: [], scores: {}, dns: {} },
    },
  },
});

describe("getAllAroundFinalRankings", () => {
  it("uses DNS at apparatus level and DNF at aggregate level", () => {
    const rankings = getAllAroundFinalRankings(createBaseState());
    const row = rankings[0];

    expect(row.apparatus.UB.resultState).toBe("DNS");
    expect(row.isDnf).toBe(true);
    expect(row.total).toBe(40.8);
  });
});
