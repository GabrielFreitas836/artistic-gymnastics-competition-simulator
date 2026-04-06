import { getAllAroundFinalQualificationPool } from "@/lib/simulation/finals/all-around";
import {
  getQualificationCompletionStatus,
  getTeamFinalQualificationPool,
} from "@/lib/simulation/finals/team";
import { SimulationState } from "@/lib/types";

export const getFinalsAvailability = (state: SimulationState) => {
  const qualificationCompletion = getQualificationCompletionStatus(state);
  const teamFinalPool = getTeamFinalQualificationPool(state);
  const allAroundFinalPool = getAllAroundFinalQualificationPool(state);

  const canOpenTeamFinal =
    qualificationCompletion.isComplete && teamFinalPool.qualified.length >= 8;
  const canOpenAllAroundFinal =
    qualificationCompletion.isComplete && allAroundFinalPool.qualified.length > 0;

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
    teamFinalPool,
    allAroundFinalPool,
    canOpenTeamFinal,
    canOpenAllAroundFinal,
    teamFinalMessage,
    allAroundFinalMessage,
  };
};
