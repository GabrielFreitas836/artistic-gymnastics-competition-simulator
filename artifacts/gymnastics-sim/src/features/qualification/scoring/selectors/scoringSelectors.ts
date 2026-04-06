import { getCountryById } from "@/lib/countries";
import { getTeamApparatusResult } from "@/lib/simulation/scoring";
import { selectAllGymnasts } from "@/lib/simulation/selectors";
import { Apparatus, ApparatusKey, Gymnast, SimulationState } from "@/lib/types";

export const QUALIFICATION_APPARATUS_ORDER: ApparatusKey[] = ["VT", "UB", "BB", "FX"];

export interface QualificationScoringEntity {
  entityId: string;
  isTeam: boolean;
  name: string;
  flag: string | null;
  gymnasts: Gymnast[];
  teamApparatusResult: ReturnType<typeof getTeamApparatusResult> | null;
}

export const getQualificationApparatusForRotation = (
  startApp: string,
  rotationIdx: number,
): string => {
  if (startApp === "BYE") return "BYE";
  const startIdx = QUALIFICATION_APPARATUS_ORDER.indexOf(startApp as ApparatusKey);
  const currentIdx = (startIdx + rotationIdx - 1) % 4;
  return QUALIFICATION_APPARATUS_ORDER[currentIdx];
};

const sortGymnastsByApparatusOrder = (
  gymnasts: Gymnast[],
  state: SimulationState,
  entityId: string,
  apparatus: ApparatusKey,
): Gymnast[] => {
  const order = state.apparatusOrder?.[entityId]?.[apparatus];
  if (!order || order.length === 0) return gymnasts;

  return [...gymnasts].sort((a, b) => {
    const aIndex = order.indexOf(a.id);
    const bIndex = order.indexOf(b.id);

    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
};

export const getQualificationScoringEntitiesByApparatus = (
  state: SimulationState,
  activeSub: number,
  activeRot: number,
): Record<ApparatusKey, QualificationScoringEntity[]> => {
  const currentSubEntities = state.subdivisions[activeSub] || {};
  const apparatusGroups: Record<ApparatusKey, QualificationScoringEntity[]> = {
    VT: [],
    UB: [],
    BB: [],
    FX: [],
  };

  Object.entries(currentSubEntities).forEach(([entityId, startApp]) => {
    const currentApp = getQualificationApparatusForRotation(startApp, activeRot);
    if (currentApp === "BYE" || !(currentApp in apparatusGroups)) return;

    const apparatus = currentApp as ApparatusKey;
    const isTeam = !!state.teams[entityId];

    if (isTeam) {
      const team = state.teams[entityId];
      const eligibleGymnasts = team.gymnasts.filter((gymnast) =>
        gymnast.apparatus.includes(apparatus as Apparatus)
        || (apparatus === "VT" && gymnast.apparatus.includes("VT*")),
      );

      apparatusGroups[apparatus].push({
        entityId,
        isTeam: true,
        name: getCountryById(entityId).name,
        flag: getCountryById(entityId).flag,
        gymnasts: sortGymnastsByApparatusOrder(eligibleGymnasts, state, entityId, apparatus),
        teamApparatusResult: getTeamApparatusResult(team, apparatus, state.scores, state.dns),
      });

      return;
    }

    const mixedGroup = state.mixedGroups[entityId];
    const eligibleGymnasts = mixedGroup.gymnasts.filter((gymnast) =>
      gymnast.apparatus.includes(apparatus as Apparatus)
      || (apparatus === "VT" && gymnast.apparatus.includes("VT*")),
    );

    apparatusGroups[apparatus].push({
      entityId,
      isTeam: false,
      name: mixedGroup.name,
      flag: null,
      gymnasts: sortGymnastsByApparatusOrder(eligibleGymnasts, state, entityId, apparatus),
      teamApparatusResult: null,
    });
  });

  return apparatusGroups;
};

export const getQualificationLiveRankingInput = (state: SimulationState) => {
  const allGymnasts = selectAllGymnasts(state);
  return {
    allGymnasts,
  };
};
