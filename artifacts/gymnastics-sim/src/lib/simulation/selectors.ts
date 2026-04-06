import { Gymnast, SimulationState } from "@/lib/types";

export const selectAllGymnasts = (state: SimulationState): Gymnast[] => [
  ...Object.values(state.teams).flatMap((team) => team.gymnasts),
  ...Object.values(state.mixedGroups).flatMap((group) => group.gymnasts),
];

export const selectGymnastLookup = (state: SimulationState): Map<string, Gymnast> =>
  new Map(selectAllGymnasts(state).map((gymnast) => [gymnast.id, gymnast]));
