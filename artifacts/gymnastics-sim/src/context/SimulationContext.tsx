import React, { createContext, useContext, useEffect, useReducer } from "react";

import { SimulationState } from "@/lib/types";

import { readPersistedSimulation, writePersistedSimulation } from "./simulationPersistence";
import { simulationReducer } from "./simulationReducer";
import { initialState, SimulationAction } from "./simulationState";

const SimulationContext = createContext<{
  state: SimulationState;
  dispatch: React.Dispatch<SimulationAction>;
} | undefined>(undefined);

export const SimulationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(simulationReducer, initialState, readPersistedSimulation);

  useEffect(() => {
    writePersistedSimulation(state);
  }, [state]);

  return (
    <SimulationContext.Provider value={{ state, dispatch }}>
      {children}
    </SimulationContext.Provider>
  );
};

export const useSimulation = () => {
  const context = useContext(SimulationContext);
  if (!context) throw new Error("useSimulation must be used within a SimulationProvider");
  return context;
};
