import { COUNTRIES } from "./countries";
import {
  createApparatusMap,
  createSubdivisionsSkeleton,
  getApparatusForDiscipline,
  getDisciplineConfig,
} from "./competition";
import { competesOnApparatus } from "./scoring";
import {
  Apparatus,
  ApparatusKey,
  Discipline,
  Gymnast,
  MixedGroup,
  SimulationHydrationPayload,
  Team,
  TeamAssignmentMap,
} from "./types";
import {
  REDUCED_TEAM_MEMBER_COUNT,
  STANDARD_TEAM_MEMBER_COUNT,
  createEmptyQualificationStandByUsage,
  createTeamAssignmentMap,
  getTeamAssignmentStatus,
  normalizeTeamRoster,
} from "./teamRoster";

type RandomSource = () => number;
type FetchLike = typeof fetch;

interface TeamBlueprintGymnast {
  id: string;
  countryId: string;
  apparatus: Apparatus[];
  teamAssignments: TeamAssignmentMap;
}

interface TeamBlueprint {
  countryId: string;
  rosterFormat: 3 | 5;
  gymnasts: TeamBlueprintGymnast[];
}

interface MixedGroupBlueprintGymnast {
  id: string;
  countryId: string;
  apparatus: Apparatus[];
  mixedGroupId: string;
}

interface MixedGroupBlueprint {
  id: string;
  name: string;
  gymnasts: MixedGroupBlueprintGymnast[];
}

interface RandomUserResponse {
  results?: Array<{
    name?: {
      first?: string;
      last?: string;
    };
  }>;
}

export type QuickSetupSnapshot = SimulationHydrationPayload;

const TEAM_COUNT = 12;
const TEAM_SIZE = 5;
const REDUCED_TEAM_COUNT = 3;
const STANDARD_TEAM_COUNT = TEAM_COUNT - REDUCED_TEAM_COUNT;
const MIN_MIXED_GROUP_SIZE = 2;
const MAX_MIXED_GROUP_SIZE = 6;
const MAX_MIXED_COUNTRY_COUNT = 3;
const MAX_GENERATION_ATTEMPTS = 8;
const RANDOM_USER_TIMEOUT_MS = 4000;
const STANDBY_PREMARK_CHANCE = 0.35;

const TEAM_ROSTER_TEMPLATES: Apparatus[][][] = [
  [
    ["VT", "UB", "BB", "FX"],
    ["VT", "UB", "BB", "FX"],
    ["VT", "UB", "BB", "FX"],
    ["VT", "BB", "FX"],
    ["UB"]
  ],
  [
    ["VT", "UB", "BB", "FX"],
    ["VT", "UB", "BB", "FX"],
    ["VT", "UB", "BB", "FX"],
    ["VT", "FX"],
    ["UB", "BB"]
  ],
  [
    ["VT", "UB", "BB", "FX"],
    ["VT", "UB", "BB", "FX"],
    ["VT", "UB", "BB", "FX"],
    ["VT", "BB"],
    ["UB", "FX"]
  ],
  [
    ["VT*", "UB", "BB", "FX"],
    ["VT", "UB", "BB", "FX"],
    ["VT", "UB", "BB", "FX"],
    ["VT", "BB", "FX"],
    ["UB"]
  ],
  [
    ["VT", "UB", "BB", "FX"],
    ["VT*", "UB", "BB", "FX"],
    ["VT*", "UB", "BB", "FX"],
    ["VT", "FX"],
    ["UB", "BB"]
  ],
  [
    ["VT", "UB", "BB", "FX"],
    ["VT", "UB", "BB", "FX"],
    ["VT", "UB", "BB", "FX"],
    ["VT*", "BB"],
    ["UB", "FX"]
  ],
  [
    ["VT*", "UB", "BB", "FX"],
    ["VT", "UB", "BB", "FX"],
    ["VT", "UB", "BB"],
    ["VT", "BB", "FX"],
    ["UB", "FX"],
  ],
  [
    ["VT*", "UB", "BB", "FX"],
    ["VT", "UB", "BB", "FX"],
    ["VT", "UB", "FX"],
    ["UB", "BB", "FX"],
    ["BB", "FX"],
  ],
  [
    ["VT*", "UB", "BB", "FX"],
    ["VT", "UB", "BB"],
    ["VT", "BB", "FX"],
    ["VT", "UB", "FX"],
    ["UB", "FX"],
  ],
  [
    ["VT*", "UB", "BB", "FX"],
    ["VT", "UB", "BB", "FX"],
    ["VT", "BB", "FX"],
    ["UB", "BB"],
    ["UB", "FX"],
  ],
  [
    ["VT*", "UB", "BB", "FX"],
    ["VT", "UB", "FX"],
    ["VT", "BB", "FX"],
    ["UB", "BB", "FX"],
    ["VT", "UB", "BB"],
  ],
  [
    ["VT*", "UB", "BB", "FX"],
    ["VT", "UB", "BB"],
    ["VT", "UB", "FX"],
    ["BB", "FX"],
    ["UB", "BB", "FX"],
  ],
  [
    ["VT", "UB", "BB", "FX"],
    ["VT", "UB", "BB", "FX"],
    ["VT", "UB", "BB", "FX"],
    ["VT", "UB", "BB", "FX"],
    []
  ]
];

const MAG_TEAM_ROSTER_TEMPLATES: Apparatus[][][] = [
  [
    ["FX", "PH", "SR", "VT", "PB", "HB"],
    ["FX", "PH", "SR", "PB"],
    ["FX", "VT", "PB", "HB"],
    ["PH", "SR", "VT", "HB"],
    ["FX", "VT", "PB", "HB"],
  ],
  [
    ["FX", "PH", "SR", "VT", "PB", "HB"],
    ["FX", "PH", "SR", "VT"],
    ["FX", "PB", "HB"],
    ["PH", "SR", "PB", "HB"],
    ["VT", "PB", "HB"],
  ],
  [
    ["FX", "PH", "SR", "VT", "PB", "HB"],
    ["FX", "PH", "VT", "PB"],
    ["SR", "VT", "PB", "HB"],
    ["FX", "PH", "SR", "HB"],
    ["FX", "VT", "HB"],
  ],
  [
    ["FX", "PH", "SR", "VT", "PB", "HB"],
    ["FX", "PH", "SR", "VT", "PB"],
    ["FX", "PB", "HB"],
    ["PH", "SR", "VT", "HB"],
    ["VT", "PB", "HB"],
  ],
  [
    ["FX", "PH", "SR", "VT", "PB", "HB"],
    ["FX", "PH", "SR", "HB"],
    ["FX", "VT", "PB", "HB"],
    ["PH", "SR", "VT", "PB"],
    ["VT", "PB", "HB"],
  ],
];

const TWO_EVENT_PROFILES: Apparatus[][] = [
  ["VT", "FX"],
  ["UB", "BB"],
  ["VT", "UB"],
  ["BB", "FX"],
  ["UB", "FX"],
  ["VT", "BB"]
];

const THREE_EVENT_PROFILES: Apparatus[][] = [
  ["VT", "UB", "BB"],
  ["VT", "BB", "FX"],
  ["UB", "BB", "FX"],
  ["VT", "UB", "FX"],
];

const MAG_TWO_EVENT_PROFILES: Apparatus[][] = [
  ["FX", "VT"],
  ["PH", "SR"],
  ["SR", "HB"],
  ["VT", "PB"],
  ["PB", "HB"],
  ["FX", "PB"],
];

const MAG_THREE_EVENT_PROFILES: Apparatus[][] = [
  ["FX", "PH", "SR"],
  ["FX", "VT", "PB"],
  ["PH", "SR", "HB"],
  ["VT", "PB", "HB"],
  ["FX", "PB", "HB"],
];

const RANDOM_USER_NAT_BY_COUNTRY_ID: Partial<Record<string, string>> = {
  AUS: "AU",
  BRA: "BR",
  CAN: "CA",
  CHN: "CN",
  SUI: "CH",
  GER: "DE",
  DEN: "DK",
  ESP: "ES",
  FIN: "FI",
  FRA: "FR",
  GBR: "GB",
  IRL: "IE",
  IND: "IN",
  IRI: "IR",
  MEX: "MX",
  NED: "NL",
  NOR: "NO",
  NZL: "NZ",
  SRB: "RS",
  TUR: "TR",
  UKR: "UA",
  USA: "US",
};

const countryNameById = new Map(COUNTRIES.map((country) => [country.id, country.name]));

const getOfficialApparatus = (discipline: Discipline): ApparatusKey[] =>
  [...getApparatusForDiscipline(discipline)];

const getTeamRosterTemplates = (discipline: Discipline): Apparatus[][][] =>
  discipline === "MAG" ? MAG_TEAM_ROSTER_TEMPLATES : TEAM_ROSTER_TEMPLATES;

const getTwoEventProfiles = (discipline: Discipline): Apparatus[][] =>
  discipline === "MAG" ? MAG_TWO_EVENT_PROFILES : TWO_EVENT_PROFILES;

const getThreeEventProfiles = (discipline: Discipline): Apparatus[][] =>
  discipline === "MAG" ? MAG_THREE_EVENT_PROFILES : THREE_EVENT_PROFILES;

const createEmptySubdivisions = (discipline: Discipline): QuickSetupSnapshot["subdivisions"] =>
  createSubdivisionsSkeleton(discipline);

const createEmptyFinals = (): QuickSetupSnapshot["finals"] => ({
  teamFinal: {
    slots: [],
    lineups: {},
    scores: {},
    dns: {},
  },
  allAroundFinal: {
    slots: [],
    scores: {},
    dns: {},
  },
  apparatusFinals: createApparatusMap(() => ({
    slots: [],
    scores: {},
    dns: {},
  })),
});

const shuffle = <T>(items: T[], rng: RandomSource): T[] => {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const targetIndex = Math.floor(rng() * (index + 1));
    [copy[index], copy[targetIndex]] = [copy[targetIndex], copy[index]];
  }
  return copy;
};

const sample = <T>(items: T[], rng: RandomSource): T => {
  if (items.length === 0) {
    throw new Error("Cannot sample from an empty collection.");
  }
  return items[Math.floor(rng() * items.length)];
};

const countryLabel = (countryId: string): string => countryNameById.get(countryId) || countryId;

const createTitularAssignmentsFromProfile = (
  profile: Apparatus[],
  discipline: Discipline,
): TeamAssignmentMap => {
  const assignments = createTeamAssignmentMap(discipline, "inactive");
  getOfficialApparatus(discipline).forEach((apparatus) => {
    const isAssigned =
      apparatus === "VT"
        ? profile.includes("VT") || profile.includes("VT*")
        : profile.includes(apparatus);

    if (isAssigned) {
      assignments[apparatus] = "titular";
    }
  });
  return assignments;
};

const pickReducedTeamDoubleVaultCount = (rng: RandomSource): 1 | 2 | 3 => {
  const roll = rng();
  if (roll < 0.6) return 1;
  if (roll < 0.9) return 2;
  return 3;
};

const buildReducedTeamBlueprint = (
  countryId: string,
  rng: RandomSource,
  discipline: Discipline,
): TeamBlueprint => {
  const officialApparatus = getOfficialApparatus(discipline);
  const doubleVaultCount = pickReducedTeamDoubleVaultCount(rng);
  const doubleVaultIndexes = new Set(
    shuffle(
      Array.from({ length: REDUCED_TEAM_MEMBER_COUNT }, (_, index) => index),
      rng,
    ).slice(0, doubleVaultCount),
  );

  return {
    countryId,
    rosterFormat: REDUCED_TEAM_MEMBER_COUNT,
    gymnasts: Array.from({ length: TEAM_SIZE }, (_, index) => {
      const isActiveGymnast = index < REDUCED_TEAM_MEMBER_COUNT;
      const apparatus = isActiveGymnast
        ? officialApparatus.map((entry) =>
          entry === "VT" && doubleVaultIndexes.has(index) ? "VT*" : entry,
        )
        : [];

      return {
        id: `${countryId}_G${index + 1}`,
        countryId,
        apparatus,
        teamAssignments: createTeamAssignmentMap(
          discipline,
          isActiveGymnast ? "titular" : "inactive",
        ),
      };
    }),
  };
};

const premarkStandardTeamStandByAssignments = (
  gymnasts: TeamBlueprintGymnast[],
  rng: RandomSource,
  discipline: Discipline,
): void => {
  getOfficialApparatus(discipline).forEach((apparatus) => {
    const titularCount = gymnasts.filter(
      (gymnast) => gymnast.teamAssignments[apparatus] === "titular",
    ).length;

    if (titularCount !== 4 || rng() >= STANDBY_PREMARK_CHANCE) {
      return;
    }

    const standByCandidates = gymnasts.filter(
      (gymnast) => gymnast.teamAssignments[apparatus] !== "titular",
    );

    if (standByCandidates.length === 0) {
      return;
    }

    sample(standByCandidates, rng).teamAssignments[apparatus] = "standby";
  });
};

const buildStandardTeamBlueprint = (
  countryId: string,
  rng: RandomSource,
  discipline: Discipline,
): TeamBlueprint => {
  const template = sample(getTeamRosterTemplates(discipline), rng);
  const profiles = shuffle(
    template.map((apparatus) => [...apparatus]),
    rng,
  );
  const gymnasts = profiles.map((apparatus, index) => ({
    id: `${countryId}_G${index + 1}`,
    countryId,
    apparatus,
    teamAssignments: createTitularAssignmentsFromProfile(apparatus, discipline),
  }));

  premarkStandardTeamStandByAssignments(gymnasts, rng, discipline);

  return {
    countryId,
    rosterFormat: STANDARD_TEAM_MEMBER_COUNT,
    gymnasts,
  };
};

export const pickSelectedCountries = (rng: RandomSource = Math.random): string[] =>
  shuffle(
    COUNTRIES.map((country) => country.id),
    rng,
  ).slice(0, TEAM_COUNT);

const buildTeamsBlueprint = (
  selectedCountries: string[],
  rng: RandomSource,
  discipline: Discipline,
): TeamBlueprint[] => {
  const reducedCountryIds = new Set(
    shuffle([...selectedCountries], rng).slice(0, REDUCED_TEAM_COUNT),
  );

  return selectedCountries.map((countryId) =>
    reducedCountryIds.has(countryId)
      ? buildReducedTeamBlueprint(countryId, rng, discipline)
      : buildStandardTeamBlueprint(countryId, rng, discipline),
  );
};

const buildMixedGroupProfile = (
  rng: RandomSource,
  discipline: Discipline,
): Apparatus[] => {
  const officialApparatus = getOfficialApparatus(discipline);
  const roll = rng();
  const baseProfile: Apparatus[] =
    roll < 0.7
      ? [...officialApparatus]
      : roll < 0.9
        ? sample(getTwoEventProfiles(discipline), rng)
        : sample(getThreeEventProfiles(discipline), rng);

  const profile = [...baseProfile];
  if (profile.includes("VT") && rng() < 0.2) {
    const vtIndex = profile.indexOf("VT");
    profile[vtIndex] = "VT*";
  }

  return profile;
};

const buildMixedGroupsBlueprint = (
  selectedCountries: string[],
  rng: RandomSource,
  discipline: Discipline,
): Record<string, MixedGroupBlueprint> => {
  const mixedGroupCount = getDisciplineConfig(discipline).mixedGroupCount;
  const mixedGymnastTotal = getDisciplineConfig(discipline).mixedGymnastTotal;
  const eligibleCountryIds = COUNTRIES
    .filter((country) => !selectedCountries.includes(country.id))
    .map((country) => country.id);

  const countryPool = shuffle(
    eligibleCountryIds.flatMap((countryId) =>
      Array.from({ length: MAX_MIXED_COUNTRY_COUNT }, () => countryId),
    ),
    rng,
  );

  if (countryPool.length < mixedGymnastTotal) {
    throw new Error("Not enough eligible countries to build mixed groups.");
  }

  const selectedMixedCountryIds = countryPool.slice(0, mixedGymnastTotal);
  const groupSizes = Array.from({ length: mixedGroupCount }, () => MIN_MIXED_GROUP_SIZE);

  let remainingSlots = mixedGymnastTotal - mixedGroupCount * MIN_MIXED_GROUP_SIZE;
  while (remainingSlots > 0) {
    const availableGroupIndexes = groupSizes
      .map((size, index) => ({ size, index }))
      .filter((entry) => entry.size < MAX_MIXED_GROUP_SIZE)
      .map((entry) => entry.index);

    const targetGroupIndex = sample(availableGroupIndexes, rng);
    groupSizes[targetGroupIndex] += 1;
    remainingSlots -= 1;
  }

  const groups: Record<string, MixedGroupBlueprint> = {};
  let countryIndex = 0;

  for (let groupNumber = 1; groupNumber <= mixedGroupCount; groupNumber += 1) {
    const groupId = `MG${groupNumber}`;
    const size = groupSizes[groupNumber - 1];

    groups[groupId] = {
      id: groupId,
      name: `Mixed Group ${groupNumber}`,
      gymnasts: Array.from({ length: size }, (_, gymnastIndex) => {
        const countryId = selectedMixedCountryIds[countryIndex];
        countryIndex += 1;

        return {
          id: `${groupId}_${countryId}_G${gymnastIndex + 1}`,
          countryId,
          apparatus: buildMixedGroupProfile(rng, discipline),
          mixedGroupId: groupId,
        };
      }),
    };
  }

  return groups;
};

const countGymnastsByCountry = (
  teamBlueprints: TeamBlueprint[],
  mixedGroupBlueprints: Record<string, MixedGroupBlueprint>,
): Record<string, number> => {
  const counts: Record<string, number> = {};

  teamBlueprints.forEach((team) => {
    counts[team.countryId] = (counts[team.countryId] || 0) + team.gymnasts.length;
  });

  Object.values(mixedGroupBlueprints).forEach((group) => {
    group.gymnasts.forEach((gymnast) => {
      counts[gymnast.countryId] = (counts[gymnast.countryId] || 0) + 1;
    });
  });

  return counts;
};

const buildFallbackNames = (countryId: string, count: number): string[] =>
  Array.from({ length: count }, (_, index) => `${countryLabel(countryId)} Athlete ${index + 1}`);

const fetchCountryNames = async (
  countryId: string,
  count: number,
  fetchImpl: FetchLike,
): Promise<string[]> => {
  const natCode = RANDOM_USER_NAT_BY_COUNTRY_ID[countryId];
  if (!natCode) {
    return [];
  }

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId =
    controller !== null
      ? setTimeout(() => controller.abort(), RANDOM_USER_TIMEOUT_MS)
      : undefined;

  try {
    const response = await fetchImpl(
      `https://randomuser.me/api/?results=${count}&nat=${natCode}&inc=name`,
      controller ? { signal: controller.signal } : undefined,
    );

    if (!response.ok) {
      throw new Error(`Name lookup failed for ${countryId}.`);
    }

    const payload = (await response.json()) as RandomUserResponse;
    return (payload.results || [])
      .map((entry) => `${entry.name?.first || ""} ${entry.name?.last || ""}`.trim())
      .filter((name) => name.length > 0)
      .slice(0, count);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const resolveCountryNames = async (
  countryCounts: Record<string, number>,
  fetchImpl: FetchLike = fetch,
): Promise<Record<string, string[]>> => {
  const entries = Object.entries(countryCounts);
  const settled = await Promise.allSettled(
    entries.map(async ([countryId, count]) => {
      const fetchedNames = await fetchCountryNames(countryId, count, fetchImpl);
      const fallbackNames = buildFallbackNames(countryId, count);

      return [
        countryId,
        [...fetchedNames, ...fallbackNames].slice(0, count),
      ] as const;
    }),
  );

  return settled.reduce<Record<string, string[]>>((accumulator, result, index) => {
    const [countryId, count] = entries[index];
    accumulator[countryId] =
      result.status === "fulfilled"
        ? result.value[1]
        : buildFallbackNames(countryId, count);
    return accumulator;
  }, {});
};

const materializeTeams = (
  teamBlueprints: TeamBlueprint[],
  countryNames: Record<string, string[]>,
  discipline: Discipline,
): Record<string, Team> =>
  teamBlueprints.reduce<Record<string, Team>>((accumulator, team) => {
    const names = [...(countryNames[team.countryId] || [])];
    accumulator[team.countryId] = normalizeTeamRoster({
      countryId: team.countryId,
      rosterFormat: team.rosterFormat,
      gymnasts: team.gymnasts.map((gymnast, index) => ({
        id: gymnast.id,
        name: names[index] || `${countryLabel(team.countryId)} Athlete ${index + 1}`,
        countryId: gymnast.countryId,
        apparatus: [...gymnast.apparatus],
        teamAssignments: gymnast.teamAssignments ? { ...gymnast.teamAssignments } : undefined,
      })),
    }, discipline);
    return accumulator;
  }, {});

const materializeMixedGroups = (
  mixedGroupBlueprints: Record<string, MixedGroupBlueprint>,
  countryNames: Record<string, string[]>,
): Record<string, MixedGroup> => {
  const nameQueues = Object.entries(countryNames).reduce<Record<string, string[]>>(
    (accumulator, [countryId, names]) => {
      accumulator[countryId] = [...names];
      return accumulator;
    },
    {},
  );

  return Object.values(mixedGroupBlueprints).reduce<Record<string, MixedGroup>>(
    (accumulator, group) => {
      accumulator[group.id] = {
        id: group.id,
        name: group.name,
        gymnasts: group.gymnasts.map((gymnast, index) => ({
          id: gymnast.id,
          name:
            nameQueues[gymnast.countryId]?.shift()
            || `${countryLabel(gymnast.countryId)} Athlete ${index + 1}`,
          countryId: gymnast.countryId,
          apparatus: [...gymnast.apparatus],
          isMixedGroup: true,
          mixedGroupId: gymnast.mixedGroupId,
        })),
      };
      return accumulator;
    },
    {},
  );
};

const drawSubdivisions = (
  teams: Record<string, Team>,
  mixedGroups: Record<string, MixedGroup>,
  rng: RandomSource,
  discipline: Discipline,
): QuickSetupSnapshot["subdivisions"] => {
  const config = getDisciplineConfig(discipline);
  const officialApparatus = getOfficialApparatus(discipline);
  const entities = shuffle(
    [...Object.keys(teams), ...Object.keys(mixedGroups)],
    rng,
  );
  const subdivisions = createEmptySubdivisions(discipline);

  for (let subdivision = 1; subdivision <= config.subdivisionCount; subdivision += 1) {
    const entitySlice = entities.slice(
      (subdivision - 1) * config.entitiesPerSubdivision,
      subdivision * config.entitiesPerSubdivision,
    );
    const apparatusOrder = shuffle([...officialApparatus], rng);

    entitySlice.forEach((entityId, index) => {
      subdivisions[subdivision][entityId] = apparatusOrder[index];
    });
  }

  return subdivisions;
};

const buildEntityApparatusOrder = (
  gymnasts: Gymnast[],
  rng: RandomSource,
  discipline: Discipline,
): QuickSetupSnapshot["apparatusOrder"][string] =>
  getOfficialApparatus(discipline).reduce<QuickSetupSnapshot["apparatusOrder"][string]>(
    (accumulator, apparatus) => {
      const eligibleIds = shuffle(
        gymnasts
          .filter((gymnast) => competesOnApparatus(gymnast, apparatus))
          .map((gymnast) => gymnast.id),
        rng,
      );

      if (eligibleIds.length > 0) {
        accumulator[apparatus] = eligibleIds;
      }

      return accumulator;
    },
    {},
  );

export const buildApparatusOrder = (
  teams: Record<string, Team>,
  mixedGroups: Record<string, MixedGroup>,
  discipline: Discipline,
  rng: RandomSource = Math.random,
): QuickSetupSnapshot["apparatusOrder"] => {
  const order: QuickSetupSnapshot["apparatusOrder"] = {};

  Object.entries(teams).forEach(([countryId, team]) => {
    order[countryId] = buildEntityApparatusOrder(team.gymnasts, rng, discipline);
  });

  Object.entries(mixedGroups).forEach(([groupId, group]) => {
    order[groupId] = buildEntityApparatusOrder(group.gymnasts, rng, discipline);
  });

  return order;
};

export const validateQuickSetupSnapshot = (snapshot: QuickSetupSnapshot): void => {
  const config = getDisciplineConfig(snapshot.discipline);
  const officialApparatus = getOfficialApparatus(snapshot.discipline);
  const selectedSet = new Set(snapshot.selectedCountries);
  if (snapshot.selectedCountries.length !== TEAM_COUNT || selectedSet.size !== TEAM_COUNT) {
    throw new Error("Quick setup must select exactly 12 unique team countries.");
  }

  if (Object.keys(snapshot.teams).length !== TEAM_COUNT) {
    throw new Error("Quick setup must create 12 teams.");
  }

  const teams = Object.values(snapshot.teams);
  const reducedTeamTotal = teams.filter(
    (team) => (team.rosterFormat || STANDARD_TEAM_MEMBER_COUNT) === REDUCED_TEAM_MEMBER_COUNT,
  ).length;
  const standardTeamTotal = teams.filter(
    (team) => (team.rosterFormat || STANDARD_TEAM_MEMBER_COUNT) === STANDARD_TEAM_MEMBER_COUNT,
  ).length;

  if (reducedTeamTotal !== REDUCED_TEAM_COUNT || standardTeamTotal !== STANDARD_TEAM_COUNT) {
    throw new Error("Quick setup must create 9 standard teams and 3 reduced teams.");
  }

  teams.forEach((team) => {
    if (team.gymnasts.length !== TEAM_SIZE) {
      throw new Error(`Team ${team.countryId} must contain 5 gymnasts.`);
    }

    const rosterFormat = team.rosterFormat || STANDARD_TEAM_MEMBER_COUNT;

    team.gymnasts.forEach((gymnast) => {
      if (!gymnast.name.trim()) {
        throw new Error(`Gymnast ${gymnast.id} is missing a name.`);
      }
      if (gymnast.apparatus.includes("VT") && gymnast.apparatus.includes("VT*")) {
        throw new Error(`Gymnast ${gymnast.id} cannot compete both VT and VT*.`);
      }
    });

    officialApparatus.forEach((apparatus) => {
      const titularCount = team.gymnasts.filter(
        (gymnast) => getTeamAssignmentStatus(gymnast, apparatus) === "titular",
      ).length;
      const standByCount = team.gymnasts.filter(
        (gymnast) => getTeamAssignmentStatus(gymnast, apparatus) === "standby",
      ).length;

      if (rosterFormat === REDUCED_TEAM_MEMBER_COUNT) {
        if (titularCount !== REDUCED_TEAM_MEMBER_COUNT || standByCount !== 0) {
          throw new Error(`Reduced team ${team.countryId} has invalid ${apparatus} coverage.`);
        }
        return;
      }

      if (titularCount < 3 || titularCount > 4) {
        throw new Error(`Team ${team.countryId} has invalid ${apparatus} coverage.`);
      }
      if (standByCount > 1) {
        throw new Error(`Team ${team.countryId} has too many standbys on ${apparatus}.`);
      }
      if (standByCount > 0 && titularCount !== 4) {
        throw new Error(`Team ${team.countryId} cannot pre-mark standby on ${apparatus} without 4 titulares.`);
      }
    });

    if (rosterFormat === REDUCED_TEAM_MEMBER_COUNT) {
      team.gymnasts.forEach((gymnast, index) => {
        const expectedStatus = index < REDUCED_TEAM_MEMBER_COUNT ? "titular" : "inactive";

        officialApparatus.forEach((apparatus) => {
          if (getTeamAssignmentStatus(gymnast, apparatus) !== expectedStatus) {
            throw new Error(`Reduced team ${team.countryId} has invalid member state on ${apparatus}.`);
          }
        });
      });
    }
  });

  const mixedGroups = Object.values(snapshot.mixedGroups);
  if (mixedGroups.length !== config.mixedGroupCount) {
    throw new Error(`Quick setup must create ${config.mixedGroupCount} mixed groups.`);
  }

  const mixedCountryCounts: Record<string, number> = {};
  let mixedTotal = 0;

  mixedGroups.forEach((group) => {
    if (group.gymnasts.length < MIN_MIXED_GROUP_SIZE || group.gymnasts.length > MAX_MIXED_GROUP_SIZE) {
      throw new Error(`${group.id} must contain between 2 and 6 gymnasts.`);
    }

    group.gymnasts.forEach((gymnast) => {
      mixedTotal += 1;
      mixedCountryCounts[gymnast.countryId] = (mixedCountryCounts[gymnast.countryId] || 0) + 1;
      if (selectedSet.has(gymnast.countryId)) {
        throw new Error(`Mixed group gymnast ${gymnast.id} uses a selected team country.`);
      }
    });
  });

  if (mixedTotal !== config.mixedGymnastTotal) {
    throw new Error(`Quick setup must create exactly ${config.mixedGymnastTotal} mixed-group gymnasts.`);
  }

  Object.values(mixedCountryCounts).forEach((count) => {
    if (count > MAX_MIXED_COUNTRY_COUNT) {
      throw new Error("Mixed groups exceeded the max-per-country rule.");
    }
  });

  const allEntityIds = new Set<string>([
    ...Object.keys(snapshot.teams),
    ...Object.keys(snapshot.mixedGroups),
  ]);
  const assignedEntityIds = new Set<string>();

  for (let subdivision = 1; subdivision <= config.subdivisionCount; subdivision += 1) {
    const entries = Object.entries(snapshot.subdivisions[subdivision] || {});
    if (entries.length !== config.entitiesPerSubdivision) {
      throw new Error(`Subdivision ${subdivision} must contain ${config.entitiesPerSubdivision} entities.`);
    }

    const usedApps = new Set<ApparatusKey>();
    entries.forEach(([entityId, apparatus]) => {
      if (!allEntityIds.has(entityId)) {
        throw new Error(`Unknown entity ${entityId} in subdivisions.`);
      }
      if (apparatus === "BYE") {
        throw new Error("Quick setup should not assign BYE slots.");
      }
      if (usedApps.has(apparatus)) {
        throw new Error(`Subdivision ${subdivision} duplicated starting apparatus ${apparatus}.`);
      }
      usedApps.add(apparatus);
      assignedEntityIds.add(entityId);
    });
  }

  if (assignedEntityIds.size !== allEntityIds.size) {
    throw new Error("Every entity must be assigned to exactly one subdivision.");
  }

  if (Object.keys(snapshot.apparatusOrder).length !== allEntityIds.size) {
    throw new Error("Every entity must have apparatus order data.");
  }

  Object.entries(snapshot.apparatusOrder).forEach(([entityId, perAppOrder]) => {
    const team = snapshot.teams[entityId];
    const mixedGroup = snapshot.mixedGroups[entityId];
    const gymnasts = team ? team.gymnasts : mixedGroup ? mixedGroup.gymnasts : [];
    const gymnastIds = new Set(gymnasts.map((gymnast) => gymnast.id));

    officialApparatus.forEach((apparatus) => {
      const expectedIds = gymnasts
        .filter((gymnast) => competesOnApparatus(gymnast, apparatus))
        .map((gymnast) => gymnast.id)
        .sort();
      const storedIds = [...(perAppOrder[apparatus] || [])].sort();

      if (expectedIds.length !== storedIds.length) {
        throw new Error(`Apparatus order for ${entityId}/${apparatus} is incomplete.`);
      }

      storedIds.forEach((gymnastId, index) => {
        if (!gymnastIds.has(gymnastId) || gymnastId !== expectedIds[index]) {
          throw new Error(`Apparatus order for ${entityId}/${apparatus} is invalid.`);
        }
      });
    });
  });
};

export const generateQuickSetupSnapshot = async ({
  discipline = "WAG",
  fetchImpl = fetch,
  rng = Math.random,
  maxAttempts = MAX_GENERATION_ATTEMPTS,
}: {
  discipline?: Discipline;
  fetchImpl?: FetchLike;
  rng?: RandomSource;
  maxAttempts?: number;
} = {}): Promise<QuickSetupSnapshot> => {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const selectedCountries = pickSelectedCountries(rng);
      const teamBlueprints = buildTeamsBlueprint(selectedCountries, rng, discipline);
      const mixedGroupBlueprints = buildMixedGroupsBlueprint(selectedCountries, rng, discipline);
      const countryCounts = countGymnastsByCountry(teamBlueprints, mixedGroupBlueprints);
      const countryNames = await resolveCountryNames(countryCounts, fetchImpl);
      const teams = materializeTeams(teamBlueprints, countryNames, discipline);
      const mixedGroups = materializeMixedGroups(mixedGroupBlueprints, countryNames);
      const subdivisions = drawSubdivisions(teams, mixedGroups, rng, discipline);
      const apparatusOrder = buildApparatusOrder(teams, mixedGroups, discipline, rng);

      const snapshot: QuickSetupSnapshot = {
        discipline,
        phase: 5,
        selectedCountries,
        teams,
        mixedGroups,
        subdivisions,
        apparatusOrder,
        scores: {},
        dns: {},
        qualificationStandByUsage: createEmptyQualificationStandByUsage(),
        qualificationResultsContext: {
          activeSub: 1,
          activeRot: 1,
        },
        finals: createEmptyFinals(),
      };

      validateQuickSetupSnapshot(snapshot);
      return snapshot;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Unable to generate quick setup data.");
};
