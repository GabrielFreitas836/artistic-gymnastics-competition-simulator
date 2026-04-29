import { describe, expect, it } from "vitest";

import { createApparatusMap } from "@/lib/competition";
import {
  buildApparatusFinalSlots,
  getApparatusFinalQualificationPool,
  getApparatusFinalRankings,
} from "./selectors";
import { Score, SimulationState } from "@/lib/types";

const createApparatusScore = (total: number): Score => ({
  d: Number((total - 8.5).toFixed(3)),
  e: 8.5,
  penalty: 0,
  total,
});

const createEmptyApparatusFinals = (): SimulationState["finals"]["apparatusFinals"] =>
  createApparatusMap(() => ({ slots: [], scores: {}, dns: {} }));

const createBaseState = (): SimulationState => {
  const apparatusFinals = createEmptyApparatusFinals();
  apparatusFinals.VT = {
    slots: [
      {
        competitionOrder: 1,
        qualificationRank: 2,
        qualifiedGymnastId: "vt2",
        activeGymnastId: "vt2",
      },
      {
        competitionOrder: 2,
        qualificationRank: 1,
        qualifiedGymnastId: "vt1",
        activeGymnastId: "vt1",
      },
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
  };

  return {
    discipline: "WAG",
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
    qualificationStandByUsage: {},
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
      apparatusFinals,
    },
  };
};

const createUnevenBarsQualificationState = (): SimulationState => {
  const entries = [
    ["BRA", "g1", "Ana Silva", 15.0],
    ["USA", "g2", "Emma Stone", 14.8],
    ["CHN", "g3", "Li Wei", 14.7],
    ["ITA", "g4", "Sofia Bianchi", 14.6],
    ["JPN", "g5", "Aiko Tanaka", 14.5],
    ["FRA", "g6", "Claire Martin", 14.4],
    ["GBR", "g7", "Emily Johnson", 14.3],
    ["CAN", "g8", "Olivia Adams", 14.2],
    ["GER", "g9", "Mia Fischer", 14.2],
    ["NED", "g10", "Eva de Vries", 14.1],
    ["BEL", "g11", "Nina Peeters", 14.0],
    ["AUS", "g12", "Ruby Wilson", 13.9],
  ] as const;

  const teams = Object.fromEntries(
    entries.map(([countryId, gymnastId, name]) => [
      countryId,
      {
        countryId,
        gymnasts: [
          {
            id: gymnastId,
            name,
            countryId,
            apparatus: ["UB"],
          },
        ],
      },
    ]),
  ) as SimulationState["teams"];

  const scores = Object.fromEntries(
    entries.map(([, gymnastId, , total]) => [
      gymnastId,
      { UB: createApparatusScore(total) },
    ]),
  ) as SimulationState["scores"];

  const apparatusFinals = createEmptyApparatusFinals();

  return {
    discipline: "WAG",
    phase: 7,
    selectedCountries: [],
    teams,
    mixedGroups: {},
    subdivisions: { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} },
    scores,
    dns: {},
    qualificationStandByUsage: {},
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
      apparatusFinals,
    },
  };
};

describe("apparatus final selectors", () => {
  it("builds slots from a custom competition order without replacements", () => {
    const state = createBaseState();
    const slots = buildApparatusFinalSlots(state, "VT", ["vt2", "vt1"]);

    expect(slots.map((slot) => slot.qualifiedGymnastId)).toEqual(["vt2", "vt1"]);
    expect(slots.map((slot) => slot.activeGymnastId)).toEqual(["vt2", "vt1"]);
    expect(slots.map((slot) => slot.competitionOrder)).toEqual([1, 2]);
  });

  it.each([
    {
      replacementIds: ["g9"],
      expectedActiveIds: ["g3", "g1", "g10", "g8", "g2", "g7", "g4", "g5", "g6"],
      expectedReserveSources: ["R1"],
    },
    {
      replacementIds: ["g9", "g2"],
      expectedActiveIds: ["g3", "g1", "g10", "g8", "g11", "g7", "g4", "g5", "g6"],
      expectedReserveSources: ["R1", "R2"],
    },
    {
      replacementIds: ["g9", "g2", "g7"],
      expectedActiveIds: ["g3", "g1", "g10", "g8", "g11", "g12", "g4", "g5", "g6"],
      expectedReserveSources: ["R1", "R2", "R3"],
    },
  ])(
    "applies reserve replacements in selection order for $replacementIds",
    ({ replacementIds, expectedActiveIds, expectedReserveSources }) => {
      const state = createUnevenBarsQualificationState();
      const customOrder = ["g3", "g1", "g9", "g8", "g2", "g7", "g4", "g5", "g6"];

      const slots = buildApparatusFinalSlots(state, "UB", customOrder, replacementIds);

      expect(slots.map((slot) => slot.activeGymnastId)).toEqual(expectedActiveIds);
      expect(
        slots
          .filter((slot) => slot.reserveSource)
          .map((slot) => slot.reserveSource),
      ).toEqual(expectedReserveSources);
    },
  );

  it("selects replacement targets by gymnast id when the cutoff produces 9 finalists", () => {
    const state = createUnevenBarsQualificationState();
    const qualificationPool = getApparatusFinalQualificationPool(state, "UB");

    expect(qualificationPool.qualified.map((row) => row.gymnast.id)).toEqual([
      "g1",
      "g2",
      "g3",
      "g4",
      "g5",
      "g6",
      "g7",
      "g9",
      "g8",
    ]);

    const slots = buildApparatusFinalSlots(
      state,
      "UB",
      ["g8", "g9", "g1", "g2", "g3", "g4", "g5", "g6", "g7"],
      ["g9"],
    );

    expect(slots[0].activeGymnastId).toBe("g8");
    expect(slots[1]).toMatchObject({
      qualifiedGymnastId: "g9",
      activeGymnastId: "g10",
      reserveSource: "R1",
    });
  });

  it("uses the active gymnast stored in the final slot for apparatus rankings", () => {
    const state = createUnevenBarsQualificationState();

    state.finals.apparatusFinals.UB.slots = [
      {
        competitionOrder: 1,
        qualificationRank: 2,
        qualifiedGymnastId: "g2",
        activeGymnastId: "g10",
        reserveSource: "R1",
      },
      {
        competitionOrder: 2,
        qualificationRank: 1,
        qualifiedGymnastId: "g1",
        activeGymnastId: "g1",
      },
    ];
    state.finals.apparatusFinals.UB.scores = {
      g10: { UB: createApparatusScore(14.4) },
      g1: { UB: createApparatusScore(14.1) },
    };

    const rankings = getApparatusFinalRankings(state, "UB");

    expect(rankings[0]).toMatchObject({
      gymnast: { id: "g10" },
      medal: "Gold",
      slot: { reserveSource: "R1", qualifiedGymnastId: "g2" },
    });
    expect(rankings[1].medal).toBe("Silver");
  });

  it("uses the VT average and awards medals after all finalists are complete", () => {
    const rankings = getApparatusFinalRankings(createBaseState(), "VT");

    expect(rankings[0].gymnast.id).toBe("vt1");
    expect(rankings[0].total).toBe(14);
    expect(rankings[0].medal).toBe("Gold");
    expect(rankings[1].medal).toBe("Silver");
  });

  it("excludes single-vault gymnasts from the VT qualification pool", () => {
    const state = createBaseState();
    state.teams.CAN = {
      countryId: "CAN",
      gymnasts: [
        {
          id: "vt_single_only",
          name: "Single Only",
          countryId: "CAN",
          apparatus: ["VT"],
        },
      ],
    };
    state.scores.vt_single_only = {
      VT: createApparatusScore(14.9),
    };

    const qualificationPool = getApparatusFinalQualificationPool(state, "VT");

    expect(qualificationPool.qualified.map((row) => row.gymnast.id)).not.toContain("vt_single_only");
    expect(qualificationPool.reserves.map((row) => row.gymnast.id)).not.toContain("vt_single_only");
  });
});
