import {
  buildApparatusFinalSlots,
  getApparatusFinalRankings,
} from "./selectors";
import { SimulationState } from "@/lib/types";

const createBaseState = (): SimulationState => ({
  phase: 7,
  selectedCountries: [],
  teams: {
    BRA: {
      countryId: "BRA",
      gymnasts: [
        {
          id: "vt1",
          name: "Ana Silva",
          countryId: "BRA",
          apparatus: ["VT", "VT*"],
        },
      ],
    },
    USA: {
      countryId: "USA",
      gymnasts: [
        {
          id: "vt2",
          name: "Emma Stone",
          countryId: "USA",
          apparatus: ["VT", "VT*"],
        },
      ],
    },
  },
  mixedGroups: {},
  subdivisions: { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} },
  scores: {
    vt1: {
      "VT*": [
        { d: 5.4, e: 8.6, penalty: 0, total: 14.0 },
        { d: 5.2, e: 8.8, penalty: 0, total: 14.0 },
      ],
    },
    vt2: {
      "VT*": [
        { d: 5.1, e: 8.6, penalty: 0, total: 13.7 },
        { d: 5.0, e: 8.5, penalty: 0, total: 13.5 },
      ],
    },
  },
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
      slots: [],
      scores: {},
      dns: {},
    },
    apparatusFinals: {
      VT: {
        slots: [
          { competitionOrder: 1, qualificationRank: 2, gymnastId: "vt2" },
          { competitionOrder: 2, qualificationRank: 1, gymnastId: "vt1" },
        ],
        scores: {
          vt1: {
            "VT*": [
              { d: 5.4, e: 8.6, penalty: 0, total: 14.0 },
              { d: 5.2, e: 8.8, penalty: 0, total: 14.0 },
            ],
          },
          vt2: {
            "VT*": [
              { d: 5.1, e: 8.6, penalty: 0, total: 13.7 },
              { d: 5.0, e: 8.5, penalty: 0, total: 13.5 },
            ],
          },
        },
        dns: {},
      },
      UB: { slots: [], scores: {}, dns: {} },
      BB: { slots: [], scores: {}, dns: {} },
      FX: { slots: [], scores: {}, dns: {} },
    },
  },
});

describe("apparatus final selectors", () => {
  it("builds slots from a custom competition order", () => {
    const state = createBaseState();
    const slots = buildApparatusFinalSlots(state, "VT", ["vt2", "vt1"]);

    expect(slots.map((slot) => slot.gymnastId)).toEqual(["vt2", "vt1"]);
    expect(slots.map((slot) => slot.competitionOrder)).toEqual([1, 2]);
  });

  it("uses the VT average and awards medals after all finalists are complete", () => {
    const rankings = getApparatusFinalRankings(createBaseState(), "VT");

    expect(rankings[0].gymnast.id).toBe("vt1");
    expect(rankings[0].total).toBe(14);
    expect(rankings[0].medal).toBe("Gold");
    expect(rankings[1].medal).toBe("Silver");
  });
});
