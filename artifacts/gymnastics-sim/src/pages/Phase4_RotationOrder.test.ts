import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createEmptyFinalsState } from "@/context/simulationState";
import { useSimulation } from "@/context/SimulationContext";
import { createSubdivisionsSkeleton } from "@/lib/competition";
import type { Apparatus, Gymnast, SimulationState } from "@/lib/types";
import { useLocation } from "wouter";

import Phase4_RotationOrder from "./Phase4_RotationOrder";

vi.mock("@/context/SimulationContext", () => ({
  useSimulation: vi.fn(),
}));

vi.mock("wouter", () => ({
  useLocation: vi.fn(),
}));

const mockedUseSimulation = vi.mocked(useSimulation);
const mockedUseLocation = vi.mocked(useLocation);

const createGymnast = (
  id: string,
  name: string,
  countryId: string,
  apparatus: Apparatus[] = ["VT", "UB", "BB", "FX"],
): Gymnast => ({
  id,
  name,
  countryId,
  apparatus,
});

const createState = (): SimulationState => {
  const subdivisions = createSubdivisionsSkeleton("WAG");
  subdivisions[1] = {
    BRA: "VT",
    "mg-1": "UB",
  };

  return {
    discipline: "WAG",
    phase: 4,
    selectedCountries: ["BRA"],
    teams: {
      BRA: {
        countryId: "BRA",
        gymnasts: [createGymnast("bra-g1", "Ana", "BRA")],
      },
    },
    mixedGroups: {
      "mg-1": {
        id: "mg-1",
        name: "Mixed Group 1",
        gymnasts: [createGymnast("mg-g1", "Lia", "ARG")],
      },
    },
    subdivisions,
    scores: {},
    dns: {},
    qualificationStandByUsage: {},
    apparatusOrder: {},
    finals: createEmptyFinalsState(),
  };
};

describe("Phase4_RotationOrder", () => {
  beforeEach(() => {
    mockedUseLocation.mockReturnValue(["/rotation", vi.fn()]);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("preserves local removals across rerenders instead of rehydrating from saved subdivisions", () => {
    const state = createState();
    const dispatch = vi.fn();
    mockedUseSimulation.mockImplementation(() => ({ state, dispatch }));

    const { rerender } = render(React.createElement(Phase4_RotationOrder));

    expect(screen.getByText(/2\s*\/\s*2 assigned/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /remove brazil from rotation order/i }));

    expect(screen.getByText(/1\s*\/\s*2 assigned/i)).toBeInTheDocument();
    expect(screen.getByText(/Unassigned \(1\)/i)).toBeInTheDocument();

    rerender(React.createElement(Phase4_RotationOrder));

    expect(screen.getByText(/1\s*\/\s*2 assigned/i)).toBeInTheDocument();
    expect(screen.getByText(/Unassigned \(1\)/i)).toBeInTheDocument();
  });
});
