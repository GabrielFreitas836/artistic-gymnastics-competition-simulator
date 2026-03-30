import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { DnsEntryKey, MixedGroup, SimulationState, Team } from '../lib/types';

type Action =
  | { type: 'SET_PHASE'; payload: number }
  | { type: 'SET_COUNTRIES'; payload: string[] }
  | { type: 'SET_TEAMS'; payload: Record<string, Team> }
  | { type: 'SET_MIXED_GROUPS'; payload: Record<string, MixedGroup> }
  | { type: 'SET_SUBDIVISIONS'; payload: SimulationState['subdivisions'] }
  | { type: 'SET_APPARATUS_ORDER'; payload: SimulationState['apparatusOrder'] }
  | { type: 'UPDATE_SCORE'; payload: { gymnastId: string; app: string; score: any; vIndex?: 0 | 1 } }
  | { type: 'TOGGLE_DNS'; payload: { gymnastId: string; key: DnsEntryKey } }
  | { type: 'RESET' };

const initialState: SimulationState = {
  phase: 1,
  selectedCountries: [],
  teams: {},
  mixedGroups: {},
  subdivisions: { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} },
  scores: {},
  dns: {},
  apparatusOrder: {},
};

const LOCAL_STORAGE_KEY = 'wag-sim-state';

const reducer = (state: SimulationState, action: Action): SimulationState => {
  switch (action.type) {
    case 'SET_PHASE':
      return { ...state, phase: action.payload };
    case 'SET_COUNTRIES':
      return { ...state, selectedCountries: action.payload };
    case 'SET_TEAMS':
      return { ...state, teams: action.payload };
    case 'SET_MIXED_GROUPS':
      return { ...state, mixedGroups: action.payload };
    case 'SET_SUBDIVISIONS':
      return { ...state, subdivisions: action.payload };
    case 'SET_APPARATUS_ORDER':
      return { ...state, apparatusOrder: action.payload };
    case 'UPDATE_SCORE': {
      const { gymnastId, app, score, vIndex } = action.payload;
      const newScores = { ...state.scores };
      if (!newScores[gymnastId]) newScores[gymnastId] = {};

      if (app === 'VT*' && vIndex !== undefined) {
        if (!newScores[gymnastId]['VT*'])
          newScores[gymnastId]['VT*'] = [
            { d: 0, e: 0, penalty: 0, total: 0 },
            { d: 0, e: 0, penalty: 0, total: 0 },
          ];
        (newScores[gymnastId]['VT*'] as any)[vIndex] = score;
      } else {
        (newScores[gymnastId] as any)[app] = score;
      }
      return { ...state, scores: newScores };
    }
    case 'TOGGLE_DNS': {
      const { gymnastId, key } = action.payload;
      const current = !!state.dns[gymnastId]?.[key];
      const nextGymnastDns = {
        ...(state.dns[gymnastId] || {}),
        [key]: !current,
      };

      if (!nextGymnastDns[key]) {
        delete nextGymnastDns[key];
      }

      const nextDns = { ...state.dns };
      if (Object.keys(nextGymnastDns).length === 0) {
        delete nextDns[gymnastId];
      } else {
        nextDns[gymnastId] = nextGymnastDns;
      }

      return { ...state, dns: nextDns };
    }
    case 'RESET':
      return initialState;
    default:
      return state;
  }
};

const SimulationContext = createContext<{
  state: SimulationState;
  dispatch: React.Dispatch<Action>;
} | undefined>(undefined);

export const SimulationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState, (initial) => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!stored) return initial;
      const parsed = JSON.parse(stored);
      // Back-fill missing fields for saved states created before this version
      if (!parsed.apparatusOrder) parsed.apparatusOrder = {};
      if (!parsed.dns) parsed.dns = {};
      if (!parsed.subdivisions[5]) parsed.subdivisions[5] = {};
      return parsed;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  return (
    <SimulationContext.Provider value={{ state, dispatch }}>
      {children}
    </SimulationContext.Provider>
  );
};

export const useSimulation = () => {
  const context = useContext(SimulationContext);
  if (!context) throw new Error('useSimulation must be used within a SimulationProvider');
  return context;
};
