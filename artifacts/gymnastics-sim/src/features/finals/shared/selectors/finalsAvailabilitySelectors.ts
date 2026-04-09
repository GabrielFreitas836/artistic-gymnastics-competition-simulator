import {
  APPARATUS_FINALS,
  APPARATUS_FINAL_CODE,
  APPARATUS_FINAL_LABEL,
  APPARATUS_FINAL_ROUTE,
  getApparatusFinalQualificationPool,
  getApparatusFinalRankings,
} from "@/lib/simulation/finals/apparatus";
import { getAllAroundFinalQualificationPool } from "@/lib/simulation/finals/all-around";
import { getFinalsCompletionSummary } from "@/lib/simulation/finals/summary";
import {
  getQualificationCompletionStatus,
  getTeamFinalQualificationPool,
} from "@/lib/simulation/finals/team";
import { ApparatusKey, SimulationState } from "@/lib/types";

export const getFinalsAvailability = (state: SimulationState) => {
  const qualificationCompletion = getQualificationCompletionStatus(state);
  const teamFinalPool = getTeamFinalQualificationPool(state);
  const allAroundFinalPool = getAllAroundFinalQualificationPool(state);
  const finalsCompletion = getFinalsCompletionSummary(state);

  const canOpenTeamFinal =
    qualificationCompletion.isComplete && teamFinalPool.qualified.length >= 8;
  const canOpenAllAroundFinal =
    qualificationCompletion.isComplete && allAroundFinalPool.qualified.length > 0;
  const apparatusFinals = APPARATUS_FINALS.reduce<
    Record<
      ApparatusKey,
      {
        code: string;
        label: string;
        route: string;
        pool: ReturnType<typeof getApparatusFinalQualificationPool>;
        rankings: ReturnType<typeof getApparatusFinalRankings>;
        canOpen: boolean;
        message: string;
        isComplete: boolean;
      }
    >
  >((accumulator, apparatus) => {
    const pool = getApparatusFinalQualificationPool(state, apparatus);
    const rankings = getApparatusFinalRankings(state, apparatus);
    const canOpen = qualificationCompletion.isComplete && pool.qualified.length > 0;
    const isComplete = rankings.length > 0 && rankings.every((row) => row.isComplete);

    accumulator[apparatus] = {
      code: APPARATUS_FINAL_CODE[apparatus],
      label: APPARATUS_FINAL_LABEL[apparatus],
      route: APPARATUS_FINAL_ROUTE[apparatus],
      pool,
      rankings,
      canOpen,
      message: !qualificationCompletion.isComplete
        ? qualificationCompletion.message
        : pool.qualified.length === 0
          ? `No gymnast reached the ${APPARATUS_FINAL_LABEL[apparatus]} Final.`
          : `${pool.qualified.length} finalist${pool.qualified.length === 1 ? "" : "s"} confirmed. Reserves: ${pool.reserves.map((row) => row.status).join(", ") || "none"}.`,
      isComplete,
    };
    return accumulator;
  }, {} as Record<ApparatusKey, {
    code: string;
    label: string;
    route: string;
    pool: ReturnType<typeof getApparatusFinalQualificationPool>;
    rankings: ReturnType<typeof getApparatusFinalRankings>;
    canOpen: boolean;
    message: string;
    isComplete: boolean;
  }>);

  const teamFinalMessage = !qualificationCompletion.isComplete
    ? qualificationCompletion.message
    : teamFinalPool.qualified.length < 8
      ? `Team Final needs 8 qualified teams. Currently available: ${teamFinalPool.qualified.length}.`
      : `Top 8 confirmed. Reserves available: ${teamFinalPool.reserves.map((row) => row.status).join(", ") || "none"}.`;

  const allAroundFinalMessage = !qualificationCompletion.isComplete
    ? qualificationCompletion.message
    : allAroundFinalPool.qualified.length === 0
      ? "No gymnast reached the All-Around Final."
      : `${allAroundFinalPool.qualified.length} finalists available. Reserves: ${allAroundFinalPool.reserves.map((row) => row.status).join(", ") || "none"}.`;

  return {
    qualificationCompletion,
    finalsCompletion,
    teamFinalPool,
    allAroundFinalPool,
    apparatusFinals,
    canOpenTeamFinal,
    canOpenAllAroundFinal,
    teamFinalMessage,
    allAroundFinalMessage,
    canOpenMedalSummary: finalsCompletion.isMedalTableUnlocked,
  };
};
