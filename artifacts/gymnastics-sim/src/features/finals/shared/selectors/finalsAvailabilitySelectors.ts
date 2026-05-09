import {
  APPARATUS_FINAL_LABEL,
  APPARATUS_FINAL_ROUTE,
  getApparatusFinalCode,
  getApparatusFinals,
  getApparatusFinalQualificationPool,
  getApparatusFinalRankings,
} from "@/lib/simulation/finals/apparatus";
import { getAllAroundFinalQualificationPool } from "@/lib/simulation/finals/all-around";
import { getFinalsCompletionSummary } from "@/lib/simulation/finals/summary";
import {
  getQualificationCompletionStatus,
  getTeamFinalQualificationPool,
} from "@/lib/simulation/finals/team";
import { getCompetitionConfig } from "@/lib/competitionRun";
import { ApparatusKey, SimulationState } from "@/lib/types";

type FinalStatusLabel = "Not started" | "In progress" | "Completed" | "Automatic gold";
type FinalActionLabel = "Open" | "Resume" | "Completed" | "Automatic gold";

const getFinalActionLabel = (status: FinalStatusLabel): FinalActionLabel => {
  if (status === "In progress") return "Resume";
  if (status === "Not started") return "Open";
  return status;
};

export const getFinalsAvailability = (state: SimulationState) => {
  const competitionConfig = getCompetitionConfig(state);
  const qualificationCompletion = getQualificationCompletionStatus(state);
  const teamFinalPool = competitionConfig.finalsConfiguration.hasTeamFinal
    ? getTeamFinalQualificationPool(state)
    : { qualified: [], reserves: [] };
  const allAroundFinalPool = competitionConfig.finalsConfiguration.hasAAFinal
    ? getAllAroundFinalQualificationPool(state)
    : { qualified: [], reserves: [] };
  const finalsCompletion = getFinalsCompletionSummary(state);
  const apparatusFinalsList = getApparatusFinals(state.discipline);
  const apparatusFinalCode = getApparatusFinalCode(state.discipline);

  const canOpenTeamFinal =
    competitionConfig.finalsConfiguration.hasTeamFinal
    && qualificationCompletion.isComplete
    && teamFinalPool.qualified.length >= 8;
  const canOpenAllAroundFinal =
    competitionConfig.finalsConfiguration.hasAAFinal
    && qualificationCompletion.isComplete
    && allAroundFinalPool.qualified.length > 0;
  const apparatusFinals = apparatusFinalsList.reduce<
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
        code: apparatusFinalCode[apparatus],
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
    : !competitionConfig.finalsConfiguration.hasTeamFinal
      ? "This competition does not include a team final."
    : teamFinalPool.qualified.length < 8
      ? `Team Final needs 8 qualified teams. Currently available: ${teamFinalPool.qualified.length}.`
      : `Top 8 confirmed. Reserves available: ${teamFinalPool.reserves.map((row) => row.status).join(", ") || "none"}.`;

  const allAroundFinalMessage = !qualificationCompletion.isComplete
    ? qualificationCompletion.message
    : !competitionConfig.finalsConfiguration.hasAAFinal
      ? "This competition does not include an all-around final."
    : allAroundFinalPool.qualified.length === 0
      ? "No gymnast reached the All-Around Final."
      : `${allAroundFinalPool.qualified.length} finalists available. Reserves: ${allAroundFinalPool.reserves.map((row) => row.status).join(", ") || "none"}.`;
  const teamFinalStatus: FinalStatusLabel = !competitionConfig.finalsConfiguration.hasTeamFinal
    ? "Completed"
    : finalsCompletion.teamFinalComplete
    ? "Completed"
    : state.finals.teamFinal.slots.length === 8
      ? "In progress"
      : "Not started";
  const allAroundFinalStatus: FinalStatusLabel = !competitionConfig.finalsConfiguration.hasAAFinal
    ? "Completed"
    : allAroundFinalPool.qualified.length === 1
    ? "Automatic gold"
    : finalsCompletion.allAroundFinalComplete
      ? "Completed"
      : state.finals.allAroundFinal.slots.length > 0
        ? "In progress"
        : "Not started";

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
    teamFinalStatus,
    allAroundFinalStatus,
    teamFinalActionLabel: getFinalActionLabel(teamFinalStatus),
    allAroundFinalActionLabel: getFinalActionLabel(allAroundFinalStatus),
    canOpenMedalSummary:
      competitionConfig.uiCapabilities.supportsMedalSummary && finalsCompletion.isMedalTableUnlocked,
  };
};
