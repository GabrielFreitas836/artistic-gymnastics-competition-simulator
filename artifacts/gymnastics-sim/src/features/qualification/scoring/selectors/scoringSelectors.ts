import { getCountryById } from "@/lib/countries";
import {
  createApparatusMap,
  getApparatusForDiscipline,
  getQualificationApparatusForRotation,
} from "@/lib/competition";
import { getTeamApparatusResult, isDnsActive } from "@/lib/simulation/scoring";
import { selectAllGymnasts } from "@/lib/simulation/selectors";
import {
  getTeamStandByGymnast,
  getTeamStandByUsageEntry,
  getTeamTitularDnsCount,
  isTitularOnApparatus,
} from "@/lib/teamRoster";
import { Apparatus, ApparatusKey, DnsEntryKey, Gymnast, SimulationState } from "@/lib/types";

export interface QualificationScoringRow {
  gymnast: Gymnast;
  role: "titular" | "standby";
  standByActivated: boolean;
  standByPlacement: "inline" | "footer" | null;
}

export interface QualificationScoringEntity {
  entityId: string;
  isTeam: boolean;
  name: string;
  flag: string | null;
  rows: QualificationScoringRow[];
  teamApparatusResult: ReturnType<typeof getTeamApparatusResult> | null;
}

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

const getTeamDnsKey = (gymnast: Gymnast, apparatus: ApparatusKey): DnsEntryKey =>
  apparatus === "VT" && gymnast.apparatus.includes("VT*") ? "VT1" : apparatus;

const buildTeamScoringRows = (
  state: SimulationState,
  entityId: string,
  apparatus: ApparatusKey,
): QualificationScoringRow[] => {
  const team = state.teams[entityId];
  const titulars = sortGymnastsByApparatusOrder(
    team.gymnasts.filter((gymnast) => isTitularOnApparatus(gymnast, apparatus)),
    state,
    entityId,
    apparatus,
  );
  const standByGymnast = getTeamStandByGymnast(team, apparatus);
  const dnsCount = getTeamTitularDnsCount(team, apparatus, state.dns);

  const titularRows: QualificationScoringRow[] = titulars.map((gymnast) => ({
    gymnast,
    role: "titular",
    standByActivated: false,
    standByPlacement: null,
  }));

  if (!standByGymnast || dnsCount === 0) {
    return titularRows;
  }

  const standByEntry = getTeamStandByUsageEntry(
    state.qualificationStandByUsage,
    team.countryId,
    apparatus,
  );
  const standByActivated =
    Boolean(standByEntry?.activated) && standByEntry?.standbyGymnastId === standByGymnast.id;
  const standByPlacement: QualificationScoringRow["standByPlacement"] =
    dnsCount === 1 ? "inline" : "footer";

  const standByRow: QualificationScoringRow = {
    gymnast: standByGymnast,
    role: "standby",
    standByActivated,
    standByPlacement,
  };

  if (dnsCount > 1) {
    return [...titularRows, standByRow];
  }

  const dnsIndex = titularRows.findIndex((row) =>
    isDnsActive(state.dns, row.gymnast.id, getTeamDnsKey(row.gymnast, apparatus)),
  );

  if (dnsIndex === -1) {
    return [...titularRows, standByRow];
  }

  return [
    ...titularRows.slice(0, dnsIndex + 1),
    standByRow,
    ...titularRows.slice(dnsIndex + 1),
  ];
};

const buildMixedGroupRows = (
  state: SimulationState,
  entityId: string,
  apparatus: ApparatusKey,
): QualificationScoringRow[] => {
  const mixedGroup = state.mixedGroups[entityId];
  const eligibleGymnasts = mixedGroup.gymnasts.filter((gymnast) =>
    gymnast.apparatus.includes(apparatus as Apparatus)
    || (apparatus === "VT" && gymnast.apparatus.includes("VT*")),
  );

  return sortGymnastsByApparatusOrder(eligibleGymnasts, state, entityId, apparatus).map((gymnast) => ({
    gymnast,
    role: "titular",
    standByActivated: false,
    standByPlacement: null,
  }));
};

export const getQualificationScoringEntitiesByApparatus = (
  state: SimulationState,
  activeSub: number,
  activeRot: number,
): Record<ApparatusKey, QualificationScoringEntity[]> => {
  const currentSubEntities = state.subdivisions[activeSub] || {};
  const activeApparatus = getApparatusForDiscipline(state.discipline);
  const apparatusGroups = createApparatusMap<QualificationScoringEntity[]>(() => []);

  Object.entries(currentSubEntities).forEach(([entityId, startApp]) => {
    const currentApp = getQualificationApparatusForRotation(state.discipline, startApp, activeRot);
    if (currentApp === "BYE" || !(currentApp in apparatusGroups)) return;

    const apparatus = currentApp as ApparatusKey;
    if (!activeApparatus.includes(apparatus)) return;
    const isTeam = !!state.teams[entityId];

    if (isTeam) {
      const team = state.teams[entityId];
      apparatusGroups[apparatus].push({
        entityId,
        isTeam: true,
        name: getCountryById(entityId).name,
        flag: getCountryById(entityId).flag,
        rows: buildTeamScoringRows(state, entityId, apparatus),
        teamApparatusResult: getTeamApparatusResult(
          team,
          apparatus,
          state.scores,
          state.dns,
          state.qualificationStandByUsage,
        ),
      });

      return;
    }

    const mixedGroup = state.mixedGroups[entityId];
    apparatusGroups[apparatus].push({
      entityId,
      isTeam: false,
      name: mixedGroup.name,
      flag: null,
      rows: buildMixedGroupRows(state, entityId, apparatus),
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
