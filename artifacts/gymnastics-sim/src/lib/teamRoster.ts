import { createApparatusMap, getApparatusForDiscipline } from "./competition";
import {
  Apparatus,
  ApparatusKey,
  Discipline,
  DnsMap,
  Gymnast,
  QualificationStandByUsage,
  Team,
  TeamAssignmentMap,
  TeamAssignmentStatus,
} from "./types";

export const STANDARD_TEAM_MEMBER_COUNT = 5;
export const REDUCED_TEAM_MEMBER_COUNT = 3;

const VALID_ASSIGNMENT_STATUSES: TeamAssignmentStatus[] = ["inactive", "titular", "standby"];

export const createTeamAssignmentMap = (
  discipline: Discipline,
  defaultStatus: TeamAssignmentStatus = "inactive",
): TeamAssignmentMap =>
  getApparatusForDiscipline(discipline).reduce<TeamAssignmentMap>((accumulator, apparatus) => {
    accumulator[apparatus] = defaultStatus;
    return accumulator;
  }, {});

export const isMixedGroupGymnast = (gymnast: Gymnast): boolean => Boolean(gymnast.isMixedGroup);

export const hasDoubleVaultPreference = (gymnast: Gymnast): boolean =>
  gymnast.apparatus.includes("VT*");

const legacyCompetesOnApparatus = (
  gymnast: Gymnast,
  apparatus: ApparatusKey,
): boolean =>
  apparatus === "VT"
    ? gymnast.apparatus.includes("VT") || gymnast.apparatus.includes("VT*")
    : gymnast.apparatus.includes(apparatus);

export const getTeamAssignmentStatus = (
  gymnast: Gymnast,
  apparatus: ApparatusKey,
): TeamAssignmentStatus => {
  const rawStatus = gymnast.teamAssignments?.[apparatus];
  if (rawStatus && VALID_ASSIGNMENT_STATUSES.includes(rawStatus)) {
    return rawStatus;
  }

  return legacyCompetesOnApparatus(gymnast, apparatus) ? "titular" : "inactive";
};

export const isTitularOnApparatus = (
  gymnast: Gymnast,
  apparatus: ApparatusKey,
): boolean => getTeamAssignmentStatus(gymnast, apparatus) === "titular";

export const isStandByOnApparatus = (
  gymnast: Gymnast,
  apparatus: ApparatusKey,
): boolean => getTeamAssignmentStatus(gymnast, apparatus) === "standby";

export const isInactiveOnApparatus = (
  gymnast: Gymnast,
  apparatus: ApparatusKey,
): boolean => getTeamAssignmentStatus(gymnast, apparatus) === "inactive";

export const getTeamTitularGymnasts = (
  team: Team,
  apparatus: ApparatusKey,
): Gymnast[] => team.gymnasts.filter((gymnast) => isTitularOnApparatus(gymnast, apparatus));

export const getTeamStandByGymnast = (
  team: Team,
  apparatus: ApparatusKey,
): Gymnast | null => team.gymnasts.find((gymnast) => isStandByOnApparatus(gymnast, apparatus)) || null;

export const getTeamNonInactiveGymnasts = (team: Team, discipline: Discipline): Gymnast[] => {
  const officialApparatus = getApparatusForDiscipline(discipline);
  return team.gymnasts.filter((gymnast) =>
    officialApparatus.some((apparatus) => !isInactiveOnApparatus(gymnast, apparatus)),
  );
};

export const isGymnastFullyInactive = (
  gymnast: Gymnast,
  discipline: Discipline,
): boolean =>
  getApparatusForDiscipline(discipline).every((apparatus) => isInactiveOnApparatus(gymnast, apparatus));

export const isGymnastIdleWithoutStandBy = (
  gymnast: Gymnast,
  discipline: Discipline,
): boolean =>
  getApparatusForDiscipline(discipline).every((apparatus) =>
    isInactiveOnApparatus(gymnast, apparatus),
  );

export const shouldHideIdleTeamGymnast = (
  team: Team,
  gymnast: Gymnast,
  discipline: Discipline,
): boolean => {
  if ((team.rosterFormat || STANDARD_TEAM_MEMBER_COUNT) !== STANDARD_TEAM_MEMBER_COUNT) {
    return false;
  }

  const officialApparatus = getApparatusForDiscipline(discipline);
  const allAppsFilled = officialApparatus.every(
    (apparatus) => getTeamTitularGymnasts(team, apparatus).length === 4,
  );

  return allAppsFilled && isGymnastIdleWithoutStandBy(gymnast, discipline);
};

export const createRosterGymnast = (
  countryId: string,
  index: number,
  discipline: Discipline,
  rosterFormat: 3 | 5 = 5,
): Gymnast => {
  const teamAssignments =
    rosterFormat === REDUCED_TEAM_MEMBER_COUNT && index < REDUCED_TEAM_MEMBER_COUNT
      ? createTeamAssignmentMap(discipline, "titular")
      : createTeamAssignmentMap(discipline, "inactive");
  const apparatus =
    rosterFormat === REDUCED_TEAM_MEMBER_COUNT && index < REDUCED_TEAM_MEMBER_COUNT
      ? [...getApparatusForDiscipline(discipline)]
      : [];

  return {
    id: `${countryId}_G${index + 1}`,
    name: "",
    countryId,
    apparatus,
    teamAssignments,
  };
};

const normalizeIndividualDelegation = (
  team: Team,
  discipline: Discipline,
): Team => {
  const gymnasts = team.gymnasts.map((gymnast) => {
    const teamAssignments = createTeamAssignmentMap(discipline, "inactive");

    getApparatusForDiscipline(discipline).forEach((apparatus) => {
      const isActive =
        apparatus === "VT"
          ? gymnast.apparatus.includes("VT") || gymnast.apparatus.includes("VT*")
          : gymnast.apparatus.includes(apparatus);
      teamAssignments[apparatus] = isActive ? "titular" : "inactive";
    });

    return {
      ...gymnast,
      teamAssignments,
    };
  });

  return {
    ...team,
    entryType: "INDIVIDUAL_DELEGATION",
    gymnasts,
  };
};

const syncGymnastApparatusFromAssignments = (
  gymnast: Gymnast,
  discipline: Discipline,
): Gymnast => {
  if (isMixedGroupGymnast(gymnast)) {
    return gymnast;
  }

  const nextApparatus: Apparatus[] = [];
  const useDoubleVault = hasDoubleVaultPreference(gymnast);

  getApparatusForDiscipline(discipline).forEach((apparatus) => {
    if (!isTitularOnApparatus(gymnast, apparatus)) {
      return;
    }

    if (apparatus === "VT") {
      nextApparatus.push(useDoubleVault ? "VT*" : "VT");
      return;
    }

    nextApparatus.push(apparatus);
  });

  gymnast.apparatus = nextApparatus;
  return gymnast;
};

const normalizeGymnastAssignments = (
  gymnast: Gymnast,
  discipline: Discipline,
): Gymnast => {
  if (isMixedGroupGymnast(gymnast)) {
    return gymnast;
  }

  const teamAssignments = createTeamAssignmentMap(discipline, "inactive");
  getApparatusForDiscipline(discipline).forEach((apparatus) => {
    teamAssignments[apparatus] = getTeamAssignmentStatus(gymnast, apparatus);
  });

  gymnast.teamAssignments = teamAssignments;
  return syncGymnastApparatusFromAssignments(gymnast, discipline);
};

const limitStandardTeamAssignments = (
  gymnasts: Gymnast[],
  discipline: Discipline,
): Gymnast[] => {
  const nextGymnasts = gymnasts.map((gymnast) => normalizeGymnastAssignments(gymnast, discipline));

  getApparatusForDiscipline(discipline).forEach((apparatus) => {
    const titularIndexes = nextGymnasts
      .map((gymnast, index) => ({ gymnast, index }))
      .filter(({ gymnast }) => isTitularOnApparatus(gymnast, apparatus))
      .map(({ index }) => index);

    titularIndexes.slice(4).forEach((index) => {
      nextGymnasts[index].teamAssignments![apparatus] = "inactive";
    });

    const standByIndexes = nextGymnasts
      .map((gymnast, index) => ({ gymnast, index }))
      .filter(({ gymnast }) => isStandByOnApparatus(gymnast, apparatus))
      .map(({ index }) => index);

    standByIndexes.slice(1).forEach((index) => {
      nextGymnasts[index].teamAssignments![apparatus] = "inactive";
    });

    if (titularIndexes.length < 4) {
      standByIndexes.forEach((index) => {
        nextGymnasts[index].teamAssignments![apparatus] = "inactive";
      });
    }
  });

  return nextGymnasts.map((gymnast) => syncGymnastApparatusFromAssignments(gymnast, discipline));
};

const canonicalizeReducedTeam = (
  team: Team,
  discipline: Discipline,
): Team => {
  const officialApparatus = getApparatusForDiscipline(discipline);
  const gymnasts = team.gymnasts.map((gymnast, index) => {
    const normalized = normalizeGymnastAssignments(gymnast, discipline);
    normalized.teamAssignments = createTeamAssignmentMap(discipline, "inactive");

    if (index < REDUCED_TEAM_MEMBER_COUNT) {
      officialApparatus.forEach((apparatus) => {
        normalized.teamAssignments![apparatus] = "titular";
      });

      if (!normalized.apparatus.includes("VT*")) {
        normalized.apparatus = normalized.apparatus.filter((apparatus) => apparatus !== "VT");
        normalized.apparatus.push("VT");
      }
    } else {
      normalized.apparatus = [];
    }

    return syncGymnastApparatusFromAssignments(normalized, discipline);
  });

  return {
    ...team,
    rosterFormat: REDUCED_TEAM_MEMBER_COUNT,
    gymnasts,
  };
};

export const normalizeTeamRoster = (
  team: Team,
  discipline: Discipline,
): Team => {
  if (team.entryType === "INDIVIDUAL_DELEGATION") {
    return normalizeIndividualDelegation(team, discipline);
  }

  const rosterFormat = team.rosterFormat || STANDARD_TEAM_MEMBER_COUNT;
  if (rosterFormat === REDUCED_TEAM_MEMBER_COUNT) {
    return canonicalizeReducedTeam(team, discipline);
  }

  return {
    ...team,
    rosterFormat: STANDARD_TEAM_MEMBER_COUNT,
    gymnasts: limitStandardTeamAssignments(team.gymnasts, discipline),
  };
};

export const normalizeTeams = (
  teams: Record<string, Team>,
  discipline: Discipline,
): Record<string, Team> =>
  Object.entries(teams).reduce<Record<string, Team>>((accumulator, [teamId, team]) => {
    accumulator[teamId] = normalizeTeamRoster(team, discipline);
    return accumulator;
  }, {});

const getTeamStandByTriggerDnsKey = (
  gymnast: Gymnast,
  apparatus: ApparatusKey,
): ApparatusKey | "VT1" => (
  apparatus === "VT" && gymnast.apparatus.includes("VT*") ? "VT1" : apparatus
);

export const getTeamTitularDnsCount = (
  team: Team,
  apparatus: ApparatusKey,
  dns: DnsMap,
): number =>
  getTeamTitularGymnasts(team, apparatus).filter((gymnast) =>
    Boolean(dns[gymnast.id]?.[getTeamStandByTriggerDnsKey(gymnast, apparatus)]),
  ).length;

export const getTeamStandByUsageEntry = (
  usage: QualificationStandByUsage,
  teamId: string,
  apparatus: ApparatusKey,
): { standbyGymnastId: string; activated: boolean } | null =>
  usage[teamId]?.[apparatus] || null;

export const isStandByActivationEffective = (
  team: Team,
  apparatus: ApparatusKey,
  usage: QualificationStandByUsage,
  dns: DnsMap,
): boolean => {
  const entry = getTeamStandByUsageEntry(usage, team.countryId, apparatus);
  const standByGymnast = getTeamStandByGymnast(team, apparatus);
  if (!entry || !entry.activated || !standByGymnast) {
    return false;
  }

  if (entry.standbyGymnastId !== standByGymnast.id) {
    return false;
  }

  return getTeamTitularDnsCount(team, apparatus, dns) > 0;
};

export const getActivatedStandByGymnast = (
  team: Team,
  apparatus: ApparatusKey,
  usage: QualificationStandByUsage,
  dns: DnsMap,
): Gymnast | null => {
  if (!isStandByActivationEffective(team, apparatus, usage, dns)) {
    return null;
  }

  return getTeamStandByGymnast(team, apparatus);
};

export const isQualificationActiveOnApparatus = (
  gymnast: Gymnast,
  apparatus: ApparatusKey,
  teams: Record<string, Team>,
  usage: QualificationStandByUsage = {},
  dns: DnsMap = {},
): boolean => {
  if (isMixedGroupGymnast(gymnast)) {
    return legacyCompetesOnApparatus(gymnast, apparatus);
  }

  if (isTitularOnApparatus(gymnast, apparatus)) {
    return true;
  }

  if (!isStandByOnApparatus(gymnast, apparatus)) {
    return false;
  }

  const team = teams[gymnast.countryId];
  return Boolean(
    team
    && getActivatedStandByGymnast(team, apparatus, usage, dns)?.id === gymnast.id,
  );
};

export const isEligibleForTeamFinalApparatus = (
  gymnast: Gymnast,
  apparatus: ApparatusKey,
): boolean => isTitularOnApparatus(gymnast, apparatus) || isStandByOnApparatus(gymnast, apparatus);

export const sanitizeQualificationStandByUsage = (
  teams: Record<string, Team>,
  usage: QualificationStandByUsage,
  discipline: Discipline,
): QualificationStandByUsage => {
  const normalizedTeams = normalizeTeams(teams, discipline);

  return Object.entries(usage).reduce<QualificationStandByUsage>((accumulator, [teamId, perApp]) => {
    const team = normalizedTeams[teamId];
    if (!team || !perApp) {
      return accumulator;
    }

    const nextPerApp = Object.entries(perApp).reduce<
      Partial<Record<ApparatusKey, { standbyGymnastId: string; activated: boolean }>>
    >((perAppAccumulator, [apparatusKey, entry]) => {
      if (!entry) {
        return perAppAccumulator;
      }

      const apparatus = apparatusKey as ApparatusKey;
      const standByGymnast = getTeamStandByGymnast(team, apparatus);
      if (!standByGymnast || standByGymnast.id !== entry.standbyGymnastId) {
        return perAppAccumulator;
      }

      perAppAccumulator[apparatus] = {
        standbyGymnastId: entry.standbyGymnastId,
        activated: Boolean(entry.activated),
      };
      return perAppAccumulator;
    }, {});

    if (Object.keys(nextPerApp).length > 0) {
      accumulator[teamId] = nextPerApp;
    }

    return accumulator;
  }, {});
};

export const createEmptyQualificationStandByUsage = (): QualificationStandByUsage => ({});

export const createEmptyApparatusParticipationMap = (
  discipline: Discipline,
): Record<ApparatusKey, number> =>
  createApparatusMap((apparatus) =>
    getApparatusForDiscipline(discipline).includes(apparatus) ? 0 : 0,
  );
