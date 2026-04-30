import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createEmptyFinalsState } from "@/context/simulationState";
import { useSimulation } from "@/context/SimulationContext";
import { createSubdivisionsSkeleton } from "@/lib/competition";
import { Gymnast, ScoreMap, SimulationState, Team } from "@/lib/types";
import { useLocation } from "wouter";

import Phase6_Results from "./Phase6_Results";

vi.mock("@/context/SimulationContext", () => ({
  useSimulation: vi.fn(),
}));

vi.mock("wouter", () => ({
  useLocation: vi.fn(),
}));

vi.mock("@/features/finals/shared/selectors/finalsAvailabilitySelectors", () => ({
  getFinalsAvailability: () => ({
    teamFinalMessage: "Qualification in progress.",
    allAroundFinalMessage: "Qualification in progress.",
    canOpenTeamFinal: false,
    canOpenAllAroundFinal: false,
    teamFinalPool: { qualified: [], reserves: [] },
    allAroundFinalPool: { qualified: [], reserves: [] },
    teamFinalActionLabel: "Open",
    allAroundActionLabel: "Open",
    apparatusFinals: {
      VT: {
        code: "7.3.1",
        label: "Vault",
        route: "/finals/apparatus/vault",
        message: "Qualification in progress.",
        canOpen: false,
        pool: { qualified: [], reserves: [] },
        rankings: [],
        isComplete: false,
      },
      UB: {
        code: "7.3.2",
        label: "Uneven Bars",
        route: "/finals/apparatus/uneven-bars",
        message: "Qualification in progress.",
        canOpen: false,
        pool: { qualified: [], reserves: [] },
        rankings: [],
        isComplete: false,
      },
      BB: {
        code: "7.3.3",
        label: "Balance Beam",
        route: "/finals/apparatus/balance-beam",
        message: "Qualification in progress.",
        canOpen: false,
        pool: { qualified: [], reserves: [] },
        rankings: [],
        isComplete: false,
      },
      FX: {
        code: "7.3.4",
        label: "Floor Exercise",
        route: "/finals/apparatus/floor",
        message: "Qualification in progress.",
        canOpen: false,
        pool: { qualified: [], reserves: [] },
        rankings: [],
        isComplete: false,
      },
      PH: {
        code: "",
        label: "Pommel Horse",
        route: "/finals/apparatus/pommel-horse",
        message: "Qualification in progress.",
        canOpen: false,
        pool: { qualified: [], reserves: [] },
        rankings: [],
        isComplete: false,
      },
      SR: {
        code: "",
        label: "Rings",
        route: "/finals/apparatus/rings",
        message: "Qualification in progress.",
        canOpen: false,
        pool: { qualified: [], reserves: [] },
        rankings: [],
        isComplete: false,
      },
      PB: {
        code: "",
        label: "Parallel Bars",
        route: "/finals/apparatus/parallel-bars",
        message: "Qualification in progress.",
        canOpen: false,
        pool: { qualified: [], reserves: [] },
        rankings: [],
        isComplete: false,
      },
      HB: {
        code: "",
        label: "Horizontal Bar",
        route: "/finals/apparatus/horizontal-bar",
        message: "Qualification in progress.",
        canOpen: false,
        pool: { qualified: [], reserves: [] },
        rankings: [],
        isComplete: false,
      },
    },
  }),
}));

const mockedUseSimulation = vi.mocked(useSimulation);
const mockedUseLocation = vi.mocked(useLocation);

const createGymnast = (
  id: string,
  name: string,
  countryId: string,
  apparatus: Gymnast["apparatus"] = ["VT", "UB", "BB", "FX"],
): Gymnast => ({
  id,
  name,
  countryId,
  apparatus,
});

const buildTeam = (countryId: string): Team => ({
  countryId,
  gymnasts: [
    createGymnast(`${countryId}-1`, `${countryId} One`, countryId),
    createGymnast(`${countryId}-2`, `${countryId} Two`, countryId),
    createGymnast(`${countryId}-3`, `${countryId} Three`, countryId),
  ],
});

const addScores = (
  scoreMap: ScoreMap,
  team: Team,
  totals: { VT: number[]; UB: number[]; BB: number[]; FX: number[] },
) => {
  team.gymnasts.forEach((gymnast, index) => {
    scoreMap[gymnast.id] = {
      VT: { d: 5, e: totals.VT[index] - 5, penalty: 0, total: totals.VT[index] },
      UB: { d: 5, e: totals.UB[index] - 5, penalty: 0, total: totals.UB[index] },
      BB: { d: 5, e: totals.BB[index] - 5, penalty: 0, total: totals.BB[index] },
      FX: { d: 5, e: totals.FX[index] - 5, penalty: 0, total: totals.FX[index] },
    };
  });
};

const createState = ({
  qualificationComplete,
  activeSub,
  activeRot,
}: {
  qualificationComplete: boolean;
  activeSub: number;
  activeRot: number;
}): SimulationState => {
  const bra = buildTeam("BRA");
  const chn = buildTeam("CHN");
  const usa = buildTeam("USA");
  const can = buildTeam("CAN");
  const teams = { BRA: bra, CHN: chn, USA: usa, CAN: can };
  const subdivisions = createSubdivisionsSkeleton("WAG");
  subdivisions[1] = { BRA: "VT", CHN: "UB" };
  subdivisions[2] = { USA: "BB", CAN: "FX" };

  const scores: ScoreMap = {};
  addScores(scores, bra, {
    VT: [13.2, 13.1, 13.0],
    UB: [12.8, 12.7, 12.6],
    BB: [13.0, 13.0, 13.0],
    FX: [12.0, 12.0, 12.0],
  });
  addScores(scores, chn, {
    UB: [13.0, 13.0, 13.0],
    BB: [13.1, 13.1, 13.1],
    FX: [12.9, 12.9, 12.9],
    VT: [12.8, 12.8, 12.8],
  });

  if (qualificationComplete) {
    addScores(scores, usa, {
      BB: [13.4, 13.3, 13.2],
      FX: [13.1, 13.1, 13.1],
      VT: [13.0, 13.0, 13.0],
      UB: [12.9, 12.8, 12.7],
    });
    addScores(scores, can, {
      FX: [12.7, 12.7, 12.7],
      VT: [12.9, 12.9, 12.9],
      UB: [12.8, 12.8, 12.8],
      BB: [12.6, 12.6, 12.6],
    });
  }

  return {
    discipline: "WAG",
    phase: 6,
    selectedCountries: ["BRA", "CHN", "USA", "CAN"],
    teams,
    mixedGroups: {},
    subdivisions,
    scores,
    dns: {},
    qualificationStandByUsage: {},
    apparatusOrder: {},
    qualificationResultsContext: { activeSub, activeRot },
    finals: createEmptyFinalsState(),
  };
};

const expectBefore = (firstLabel: string, secondLabel: string) => {
  const firstRow = screen.getByText(firstLabel).closest("tr");
  const secondRow = screen.getByText(secondLabel).closest("tr");

  expect(firstRow).not.toBeNull();
  expect(secondRow).not.toBeNull();
  expect(firstRow!.compareDocumentPosition(secondRow!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
};

describe("Phase6_Results", () => {
  beforeEach(() => {
    mockedUseLocation.mockReturnValue(["/results", vi.fn()]);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("defaults to the current scoring subdivision/rotation, updates the team order by dropdown, and leaves badges hidden until qualification is complete", () => {
    mockedUseSimulation.mockImplementation(() => ({
      state: createState({ qualificationComplete: false, activeSub: 1, activeRot: 2 }),
      dispatch: vi.fn(),
    }));

    render(React.createElement(Phase6_Results));

    const rotationSelect = screen.getByRole("combobox", { name: /team rotation/i });
    expect(rotationSelect).toHaveValue("2");
    expect(screen.queryByText("United States")).not.toBeInTheDocument();
    expectBefore("China", "Brazil");
    expect(screen.queryByText("QUAL")).not.toBeInTheDocument();

    fireEvent.change(rotationSelect, { target: { value: "1" } });

    expectBefore("Brazil", "China");

    fireEvent.click(screen.getByRole("button", { name: /team apparatus/i }));

    expect(screen.queryByRole("combobox", { name: /team rotation/i })).not.toBeInTheDocument();
    expect(within(screen.getByRole("table")).getByText("Brazil")).toBeInTheDocument();
  });

  it("shows the currently selected subdivision and restores QUAL badges once all team qualification scores are complete", () => {
    mockedUseSimulation.mockImplementation(() => ({
      state: createState({ qualificationComplete: true, activeSub: 2, activeRot: 1 }),
      dispatch: vi.fn(),
    }));

    render(React.createElement(Phase6_Results));

    expect(screen.getByRole("combobox", { name: /team rotation/i })).toHaveValue("1");
    expect(screen.queryByText("Brazil")).not.toBeInTheDocument();
    expect(screen.getByText("USA")).toBeInTheDocument();
    expect(screen.getByText("Canada")).toBeInTheDocument();
    expect(screen.getAllByText("QUAL")).toHaveLength(2);
  });
});
