import React, { createContext, useContext, useReducer, useEffect } from 'react';
import {
  ApparatusKey,
  DnsEntryKey,
  MixedGroup,
  Score,
  SimulationHydrationPayload,
  SimulationState,
  Team,
  TeamFinalSlot,
} from '../lib/types';

type Action =
  | { type: 'SET_PHASE'; payload: number }
  | { type: 'SET_COUNTRIES'; payload: string[] }
  | { type: 'SET_TEAMS'; payload: Record<string, Team> }
  | { type: 'SET_MIXED_GROUPS'; payload: Record<string, MixedGroup> }
  | { type: 'SET_SUBDIVISIONS'; payload: SimulationState['subdivisions'] }
  | { type: 'SET_APPARATUS_ORDER'; payload: SimulationState['apparatusOrder'] }
  | { type: 'SET_TEAM_FINAL_SLOTS'; payload: TeamFinalSlot[] }
  | {
      type: 'UPDATE_TEAM_FINAL_LINEUP';
      payload: { teamId: string; apparatus: ApparatusKey; gymnastIds: string[] };
    }
  | { type: 'HYDRATE_SIMULATION'; payload: SimulationHydrationPayload }
  | { type: 'UPDATE_SCORE'; payload: { gymnastId: string; app: string; score: any; vIndex?: 0 | 1 } }
  | {
      type: 'UPDATE_TEAM_FINAL_SCORE';
      payload: { gymnastId: string; app: string; score: Score };
    }
  | { type: 'TOGGLE_DNS'; payload: { gymnastId: string; key: DnsEntryKey } }
  | { type: 'TOGGLE_TEAM_FINAL_DNS'; payload: { gymnastId: string; key: DnsEntryKey } }
  | { type: 'RESET_TEAM_FINAL' }
  | { type: 'RESET' };

const createEmptyTeamFinalState = (): SimulationState['teamFinal'] => ({
  slots: [],
  lineups: {},
  scores: {},
  dns: {},
});

const initialState: SimulationState = {
  phase: 1,
  selectedCountries: [],
  teams: {},
  mixedGroups: {},
  subdivisions: { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} },
  scores: {},
  dns: {},
  apparatusOrder: {},
  teamFinal: createEmptyTeamFinalState(),
};

const LOCAL_STORAGE_KEY = 'wag-sim-state';

const normalizeState = (raw?: Partial<SimulationState> | null): SimulationState => ({
  ...initialState,
  ...raw,
  subdivisions: {
    1: {},
    2: {},
    3: {},
    4: {},
    5: {},
    ...(raw?.subdivisions || {}),
  },
  scores: raw?.scores || {},
  dns: raw?.dns || {},
  apparatusOrder: raw?.apparatusOrder || {},
  teamFinal: {
    ...createEmptyTeamFinalState(),
    ...(raw?.teamFinal || {}),
    slots: raw?.teamFinal?.slots || [],
    lineups: raw?.teamFinal?.lineups || {},
    scores: raw?.teamFinal?.scores || {},
    dns: raw?.teamFinal?.dns || {},
  },
});

const updateScoreState = (
  sourceScores: SimulationState['scores'],
  actionPayload: { gymnastId: string; app: string; score: any; vIndex?: 0 | 1 },
): SimulationState['scores'] => {
  const { gymnastId, app, score, vIndex } = actionPayload;
  const nextScores = { ...sourceScores };
  if (!nextScores[gymnastId]) nextScores[gymnastId] = {};

  if (app === 'VT*' && vIndex !== undefined) {
    if (!nextScores[gymnastId]['VT*']) {
      nextScores[gymnastId]['VT*'] = [
        { d: 0, e: 0, penalty: 0, total: 0 },
        { d: 0, e: 0, penalty: 0, total: 0 },
      ];
    }
    (nextScores[gymnastId]['VT*'] as any)[vIndex] = score;
  } else {
    (nextScores[gymnastId] as any)[app] = score;
  }

  return nextScores;
};

const toggleDnsState = (
  sourceDns: SimulationState['dns'],
  actionPayload: { gymnastId: string; key: DnsEntryKey },
): SimulationState['dns'] => {
  const { gymnastId, key } = actionPayload;
  const current = !!sourceDns[gymnastId]?.[key];
  const nextGymnastDns = {
    ...(sourceDns[gymnastId] || {}),
    [key]: !current,
  };

  if (!nextGymnastDns[key]) {
    delete nextGymnastDns[key];
  }

  const nextDns = { ...sourceDns };
  if (Object.keys(nextGymnastDns).length === 0) {
    delete nextDns[gymnastId];
  } else {
    nextDns[gymnastId] = nextGymnastDns;
  }

  return nextDns;
};

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
    case 'SET_TEAM_FINAL_SLOTS':
      return {
        ...state,
        teamFinal: {
          ...createEmptyTeamFinalState(),
          slots: action.payload,
        },
      };
    case 'UPDATE_TEAM_FINAL_LINEUP':
      return {
        ...state,
        teamFinal: {
          ...state.teamFinal,
          lineups: {
            ...state.teamFinal.lineups,
            [action.payload.teamId]: {
              ...(state.teamFinal.lineups[action.payload.teamId] || {}),
              [action.payload.apparatus]: action.payload.gymnastIds,
            },
          },
        },
      };
    case 'HYDRATE_SIMULATION':
      return normalizeState(action.payload);
    case 'UPDATE_SCORE':
      return {
        ...state,
        scores: updateScoreState(state.scores, action.payload),
      };
    case 'UPDATE_TEAM_FINAL_SCORE':
      return {
        ...state,
        teamFinal: {
          ...state.teamFinal,
          scores: updateScoreState(state.teamFinal.scores, action.payload),
        },
      };
    case 'TOGGLE_DNS':
      return {
        ...state,
        dns: toggleDnsState(state.dns, action.payload),
      };
    case 'TOGGLE_TEAM_FINAL_DNS':
      return {
        ...state,
        teamFinal: {
          ...state.teamFinal,
          dns: toggleDnsState(state.teamFinal.dns, action.payload),
        },
      };
    case 'RESET_TEAM_FINAL':
      return {
        ...state,
        teamFinal: createEmptyTeamFinalState(),
      };
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
      return normalizeState(parsed);
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
