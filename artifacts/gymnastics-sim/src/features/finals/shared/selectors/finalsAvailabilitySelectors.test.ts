import { beforeEach, describe, expect, it, vi } from "vitest";

import { createInitialState } from "@/context/simulationState";
import { SimulationState } from "@/lib/types";

const apparatusKeys = ["FX", "PH", "SR", "VT", "PB", "HB", "UB", "BB"] as const;

const mocks = vi.hoisted(() => ({
  qualificationCompletion: {
    isComplete: true,
    missingRoutineCount: 0,
    message: "Qualification is complete.",
  },
  teamFinalPool: {
    qualified: Array.from({ length: 8 }, (_, index) => ({ status: "Q", id: `team-${index + 1}` })),
    reserves: [{ status: "R1" }, { status: "R2" }],
  },
  allAroundFinalPool: {
    qualified: Array.from({ length: 24 }, (_, index) => ({ status: "Q", id: `gymnast-${index + 1}` })),
    reserves: [{ status: "R1" }, { status: "R2" }, { status: "R3" }, { status: "R4" }],
  },
  finalsCompletion: {
    totalFinals: 6,
    completedFinals: 0,
    teamFinalComplete: false,
    allAroundFinalComplete: false,
    apparatusFinalsComplete: 0,
    isMedalTableUnlocked: false,
  },
}));

vi.mock("@/lib/simulation/finals/apparatus", () => ({
  APPARATUS_FINAL_LABEL: {
    FX: "Floor Exercise",
    PH: "Pommel Horse",
    SR: "Still Rings",
    VT: "Vault",
    PB: "Parallel Bars",
    HB: "Horizontal Bar",
    UB: "Uneven Bars",
    BB: "Balance Beam",
  },
  APPARATUS_FINAL_ROUTE: {
    FX: "/finals/fx",
    PH: "/finals/ph",
    SR: "/finals/sr",
    VT: "/finals/vt",
    PB: "/finals/pb",
    HB: "/finals/hb",
    UB: "/finals/ub",
    BB: "/finals/bb",
  },
  getApparatusFinalCode: () => ({
    FX: "FX",
    PH: "PH",
    SR: "SR",
    VT: "VT",
    PB: "PB",
    HB: "HB",
    UB: "UB",
    BB: "BB",
  }),
  getApparatusFinals: () => [],
  getApparatusFinalQualificationPool: () => ({ qualified: [], reserves: [] }),
  getApparatusFinalRankings: () => [],
}));

vi.mock("@/lib/simulation/finals/all-around", () => ({
  getAllAroundFinalQualificationPool: () => mocks.allAroundFinalPool,
}));

vi.mock("@/lib/simulation/finals/summary", () => ({
  getFinalsCompletionSummary: () => mocks.finalsCompletion,
}));

vi.mock("@/lib/simulation/finals/team", () => ({
  getQualificationCompletionStatus: () => mocks.qualificationCompletion,
  getTeamFinalQualificationPool: () => mocks.teamFinalPool,
}));

import { getFinalsAvailability } from "./finalsAvailabilitySelectors";

const createState = (): SimulationState => ({
  ...createInitialState("OLYMPICS_WAG_2024"),
  activePhaseKey: "finals",
  completedPhaseKeys: ["teams", "roster", "mixed-groups", "rotation", "scoring", "results"],
  phase: 7,
  selectedCountries: [],
  teams: {},
  mixedGroups: {},
  subdivisions: {},
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
    apparatusFinals: apparatusKeys.reduce<SimulationState["finals"]["apparatusFinals"]>(
      (accumulator, apparatus) => {
        accumulator[apparatus] = { slots: [], scores: {}, dns: {} };
        return accumulator;
      },
      {} as SimulationState["finals"]["apparatusFinals"],
    ),
  },
});

describe("getFinalsAvailability", () => {
  beforeEach(() => {
    mocks.qualificationCompletion = {
      isComplete: true,
      missingRoutineCount: 0,
      message: "Qualification is complete.",
    };
    mocks.teamFinalPool = {
      qualified: Array.from({ length: 8 }, (_, index) => ({ status: "Q", id: `team-${index + 1}` })),
      reserves: [{ status: "R1" }, { status: "R2" }],
    };
    mocks.allAroundFinalPool = {
      qualified: Array.from({ length: 24 }, (_, index) => ({ status: "Q", id: `gymnast-${index + 1}` })),
      reserves: [{ status: "R1" }, { status: "R2" }, { status: "R3" }, { status: "R4" }],
    };
    mocks.finalsCompletion = {
      totalFinals: 6,
      completedFinals: 0,
      teamFinalComplete: false,
      allAroundFinalComplete: false,
      apparatusFinalsComplete: 0,
      isMedalTableUnlocked: false,
    };
  });

  it("returns Not started and Open for Team Final before slots are built", () => {
    const availability = getFinalsAvailability(createState());

    expect(availability.teamFinalStatus).toBe("Not started");
    expect(availability.teamFinalActionLabel).toBe("Open");
  });

  it("returns In progress and Resume for Team Final after slots are built", () => {
    const state = createState();
    state.finals.teamFinal.slots = Array.from({ length: 8 }, (_, index) => ({
      seedRank: index + 1,
      qualifiedTeamId: `team-${index + 1}`,
      activeTeamId: `team-${index + 1}`,
    }));

    const availability = getFinalsAvailability(state);

    expect(availability.teamFinalStatus).toBe("In progress");
    expect(availability.teamFinalActionLabel).toBe("Resume");
  });

  it("returns Completed for Team Final when the completion summary marks it finished", () => {
    const state = createState();
    state.finals.teamFinal.slots = Array.from({ length: 8 }, (_, index) => ({
      seedRank: index + 1,
      qualifiedTeamId: `team-${index + 1}`,
      activeTeamId: `team-${index + 1}`,
    }));
    mocks.finalsCompletion.teamFinalComplete = true;

    const availability = getFinalsAvailability(state);

    expect(availability.teamFinalStatus).toBe("Completed");
    expect(availability.teamFinalActionLabel).toBe("Completed");
  });

  it("returns Not started and Open for All-Around before slots are built", () => {
    const availability = getFinalsAvailability(createState());

    expect(availability.allAroundFinalStatus).toBe("Not started");
    expect(availability.allAroundFinalActionLabel).toBe("Open");
  });

  it("returns In progress and Resume for All-Around after slots are built", () => {
    const state = createState();
    state.finals.allAroundFinal.slots = [
      {
        slotNumber: 1,
        qualificationRank: 1,
        qualifiedGymnastId: "gymnast-1",
        activeGymnastId: "gymnast-1",
      },
    ];

    const availability = getFinalsAvailability(state);

    expect(availability.allAroundFinalStatus).toBe("In progress");
    expect(availability.allAroundFinalActionLabel).toBe("Resume");
  });

  it("returns Completed for All-Around when the completion summary marks it finished", () => {
    const state = createState();
    state.finals.allAroundFinal.slots = [
      {
        slotNumber: 1,
        qualificationRank: 1,
        qualifiedGymnastId: "gymnast-1",
        activeGymnastId: "gymnast-1",
      },
    ];
    mocks.finalsCompletion.allAroundFinalComplete = true;

    const availability = getFinalsAvailability(state);

    expect(availability.allAroundFinalStatus).toBe("Completed");
    expect(availability.allAroundFinalActionLabel).toBe("Completed");
  });

  it("keeps Automatic gold for All-Around when only one gymnast qualified", () => {
    const state = createState();
    state.finals.allAroundFinal.slots = [
      {
        slotNumber: 1,
        qualificationRank: 1,
        qualifiedGymnastId: "gymnast-1",
        activeGymnastId: "gymnast-1",
      },
    ];
    mocks.allAroundFinalPool.qualified = [{ status: "Q", id: "gymnast-1" }];
    mocks.finalsCompletion.allAroundFinalComplete = true;

    const availability = getFinalsAvailability(state);

    expect(availability.allAroundFinalStatus).toBe("Automatic gold");
    expect(availability.allAroundFinalActionLabel).toBe("Automatic gold");
  });
});
