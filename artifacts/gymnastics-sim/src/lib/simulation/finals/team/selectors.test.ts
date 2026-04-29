import { describe, expect, it } from "vitest";

import { createApparatusMap } from "@/lib/competition";
import {
  areTeamFinalLineupsComplete,
  buildTeamFinalSlots,
  getTeamFinalEligibleGymnasts,
} from "./selectors";
import { SimulationState } from "@/lib/types";

const createEmptyApparatusFinals = (): SimulationState["finals"]["apparatusFinals"] =>
  createApparatusMap(() => ({ slots: [], scores: {}, dns: {} }));

const createTeamState = (): SimulationState => ({
  discipline: "WAG",
  phase: 7,
  selectedCountries: [],
  teams: {
    BRA: {
      countryId: "BRA",
      gymnasts: [
        { id: "b1", name: "B1", countryId: "BRA", apparatus: ["VT", "UB", "BB", "FX"] },
        { id: "b2", name: "B2", countryId: "BRA", apparatus: ["VT", "UB", "BB", "FX"] },
        { id: "b3", name: "B3", countryId: "BRA", apparatus: ["VT", "UB", "BB", "FX"] },
      ],
    },
    USA: {
      countryId: "USA",
      gymnasts: [
        { id: "u1", name: "U1", countryId: "USA", apparatus: ["VT", "UB", "BB", "FX"] },
        { id: "u2", name: "U2", countryId: "USA", apparatus: ["VT", "UB", "BB", "FX"] },
        { id: "u3", name: "U3", countryId: "USA", apparatus: ["VT", "UB", "BB", "FX"] },
      ],
    },
    CHN: { countryId: "CHN", gymnasts: [] },
    ITA: { countryId: "ITA", gymnasts: [] },
    FRA: { countryId: "FRA", gymnasts: [] },
    JPN: { countryId: "JPN", gymnasts: [] },
    GBR: { countryId: "GBR", gymnasts: [] },
    CAN: { countryId: "CAN", gymnasts: [] },
    GER: { countryId: "GER", gymnasts: [] },
    NED: { countryId: "NED", gymnasts: [] },
    BEL: { countryId: "BEL", gymnasts: [] },
    KOR: { countryId: "KOR", gymnasts: [] },
  },
  mixedGroups: {
    MG1: {
      id: "MG1",
      name: "MG1",
      gymnasts: Array.from({ length: 36 }, (_, index) => ({
        id: `mg${index + 1}`,
        name: `MG ${index + 1}`,
        countryId: "BRA",
        apparatus: ["UB"],
        isMixedGroup: true,
        mixedGroupId: "MG1",
      })),
    },
  },
  subdivisions: { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} },
  scores: {},
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
    apparatusFinals: createEmptyApparatusFinals(),
  },
});

describe("team final selectors", () => {
  it("requires three unique lineup gymnasts per apparatus", () => {
    const state = createTeamState();
    state.finals.teamFinal.slots = [
      { seedRank: 1, qualifiedTeamId: "BRA", activeTeamId: "BRA" },
      { seedRank: 2, qualifiedTeamId: "USA", activeTeamId: "USA" },
      { seedRank: 3, qualifiedTeamId: "CHN", activeTeamId: "CHN" },
      { seedRank: 4, qualifiedTeamId: "ITA", activeTeamId: "ITA" },
      { seedRank: 5, qualifiedTeamId: "FRA", activeTeamId: "FRA" },
      { seedRank: 6, qualifiedTeamId: "JPN", activeTeamId: "JPN" },
      { seedRank: 7, qualifiedTeamId: "GBR", activeTeamId: "GBR" },
      { seedRank: 8, qualifiedTeamId: "CAN", activeTeamId: "CAN" },
    ];

    state.finals.teamFinal.lineups.BRA = {
      VT: ["b1", "b2", "b3"],
      UB: ["b1", "b2", "b3"],
      BB: ["b1", "b2", "b3"],
      FX: ["b1", "b2", "b3"],
    };
    state.finals.teamFinal.lineups.USA = {
      VT: ["u1", "u2", "u3"],
      UB: ["u1", "u2", "u3"],
      BB: ["u1", "u2", "u3"],
      FX: ["u1", "u2", "u3"],
    };

    expect(areTeamFinalLineupsComplete(state)).toBe(false);
  });

  it("builds at most eight team-final slots from qualification", () => {
    const state = createTeamState();
    const slots = buildTeamFinalSlots(state);

    expect(slots.length).toBeLessThanOrEqual(8);
  });

  it("keeps standby gymnasts eligible for team-final apparatus selection", () => {
    const state = createTeamState();
    state.teams.BRA = {
      countryId: "BRA",
      rosterFormat: 5,
      gymnasts: [
        { id: "b1", name: "B1", countryId: "BRA", apparatus: ["VT", "UB", "BB", "FX"] },
        { id: "b2", name: "B2", countryId: "BRA", apparatus: ["VT", "UB", "BB", "FX"] },
        { id: "b3", name: "B3", countryId: "BRA", apparatus: ["VT", "UB", "BB", "FX"] },
        { id: "b4", name: "B4", countryId: "BRA", apparatus: ["VT", "UB", "BB", "FX"] },
        {
          id: "b5",
          name: "B5",
          countryId: "BRA",
          apparatus: [],
          teamAssignments: { VT: "standby" },
        },
      ],
    };

    const eligibleIds = getTeamFinalEligibleGymnasts(state.teams.BRA, "VT").map((gymnast) => gymnast.id);

    expect(eligibleIds).toContain("b5");
    expect(eligibleIds).toHaveLength(5);
  });
});
