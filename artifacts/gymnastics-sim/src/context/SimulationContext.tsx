import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from "react";

import { createRemoteCompetitionRun, saveRemoteCompetitionSnapshot } from "@/lib/api/competitionRuns";
import { deriveQuotaAwardsForState } from "@/lib/quotaAwards";
import { SimulationState } from "@/lib/types";

import { readPersistedSimulation, writePersistedSimulation } from "./simulationPersistence";
import { simulationReducer } from "./simulationReducer";
import { createInitialState, initialState, SimulationAction } from "./simulationState";

const SimulationContext = createContext<{
  state: SimulationState;
  dispatch: React.Dispatch<SimulationAction>;
} | undefined>(undefined);

export const SimulationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(simulationReducer, initialState, readPersistedSimulation);
  const lastSyncedPayloadKeyRef = useRef<string | null>(null);
  const syncInFlightRef = useRef(false);

  const payloadKey = useMemo(() => {
    const {
      runId: _runId,
      snapshotVersion: _snapshotVersion,
      persistenceSource: _persistenceSource,
      lastSavedAt: _lastSavedAt,
      ...payload
    } = state;

    return JSON.stringify(payload);
  }, [state]);

  const hasPersistableChanges = useMemo(() => {
    const {
      runId: _runId,
      snapshotVersion: _snapshotVersion,
      persistenceSource: _persistenceSource,
      lastSavedAt: _lastSavedAt,
      ...payload
    } = state;
    const {
      runId: _initialRunId,
      snapshotVersion: _initialSnapshotVersion,
      persistenceSource: _initialPersistenceSource,
      lastSavedAt: _initialLastSavedAt,
      ...initialPayload
    } = createInitialState(state.competitionCode);

    return JSON.stringify(payload) !== JSON.stringify(initialPayload);
  }, [state]);

  useEffect(() => {
    writePersistedSimulation(state);
  }, [state]);

  useEffect(() => {
    if (!hasPersistableChanges) {
      return;
    }

    if (lastSyncedPayloadKeyRef.current === payloadKey || syncInFlightRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      syncInFlightRef.current = true;

      try {
        if (!state.runId) {
          const created = await createRemoteCompetitionRun({
            cycleId: state.cycleId,
            competitionCode: state.competitionCode,
            snapshot: state,
          });

          lastSyncedPayloadKeyRef.current = payloadKey;
          dispatch({
            type: "SET_PERSISTENCE_META",
            payload: {
              runId: created.run.runId,
              snapshotVersion: created.run.snapshotVersion,
              persistenceSource: "remote",
              lastSavedAt: created.run.lastSavedAt,
            },
          });
          return;
        }

        const saved = await saveRemoteCompetitionSnapshot(state.runId, {
          snapshot: state,
          expectedVersion: state.snapshotVersion,
          quotaAwards: deriveQuotaAwardsForState(state),
        });

        lastSyncedPayloadKeyRef.current = payloadKey;
        dispatch({
          type: "SET_PERSISTENCE_META",
          payload: {
            snapshotVersion: saved.run.snapshotVersion,
            persistenceSource: "remote",
            lastSavedAt: saved.run.lastSavedAt,
          },
        });
      } catch (error) {
        console.warn("Remote competition run sync failed.", error);
      } finally {
        syncInFlightRef.current = false;
      }
    }, 600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [dispatch, hasPersistableChanges, payloadKey, state]);

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
