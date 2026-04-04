import { COUNTRIES } from "./countries";
import { competesOnApparatus } from "./scoring";
import {
  Apparatus,
  ApparatusKey,
  Gymnast,
  MixedGroup,
  SimulationHydrationPayload,
  Team,
} from "./types";

type RandomSource = () => number;
type FetchLike = typeof fetch;

interface TeamBlueprintGymnast {
  id: string;
  countryId: string;
  apparatus: Apparatus[];
}

interface TeamBlueprint {
  countryId: string;
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
const MIXED_GROUP_COUNT = 8;
const MIXED_GYMNAST_TOTAL = 36;
const MIN_MIXED_GROUP_SIZE = 2;
const MAX_MIXED_GROUP_SIZE = 6;
const MAX_MIXED_COUNTRY_COUNT = 3;
const MAX_GENERATION_ATTEMPTS = 8;
const RANDOM_USER_TIMEOUT_MS = 4000;

const OFFICIAL_APPARATUS: ApparatusKey[] = ["VT", "UB", "BB", "FX"];

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

const createEmptySubdivisions = (): QuickSetupSnapshot["subdivisions"] => ({
  1: {},
  2: {},
  3: {},
  4: {},
  5: {},
});

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

export const pickSelectedCountries = (rng: RandomSource = Math.random): string[] =>
  shuffle(
    COUNTRIES.map((country) => country.id),
    rng,
  ).slice(0, TEAM_COUNT);

const buildTeamsBlueprint = (
  selectedCountries: string[],
  rng: RandomSource,
): TeamBlueprint[] =>
  selectedCountries.map((countryId) => {
    const template = sample(TEAM_ROSTER_TEMPLATES, rng);
    const profiles = shuffle(
      template.map((apparatus) => [...apparatus]),
      rng,
    );

    return {
      countryId,
      gymnasts: profiles.map((apparatus, index) => ({
        id: `${countryId}_G${index + 1}`,
        countryId,
        apparatus,
      })),
    };
  });

const buildMixedGroupProfile = (rng: RandomSource): Apparatus[] => {
  const roll = rng();
  const baseProfile: Apparatus[] =
    roll < 0.7
      ? ["VT", "UB", "BB", "FX"]
      : roll < 0.9
        ? sample(TWO_EVENT_PROFILES, rng)
        : sample(THREE_EVENT_PROFILES, rng);

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
): Record<string, MixedGroupBlueprint> => {
  const eligibleCountryIds = COUNTRIES
    .filter((country) => !selectedCountries.includes(country.id))
    .map((country) => country.id);

  const countryPool = shuffle(
    eligibleCountryIds.flatMap((countryId) =>
      Array.from({ length: MAX_MIXED_COUNTRY_COUNT }, () => countryId),
    ),
    rng,
  );

  if (countryPool.length < MIXED_GYMNAST_TOTAL) {
    throw new Error("Not enough eligible countries to build mixed groups.");
  }

  const selectedMixedCountryIds = countryPool.slice(0, MIXED_GYMNAST_TOTAL);
  const groupSizes = Array.from({ length: MIXED_GROUP_COUNT }, () => MIN_MIXED_GROUP_SIZE);

  let remainingSlots = MIXED_GYMNAST_TOTAL - MIXED_GROUP_COUNT * MIN_MIXED_GROUP_SIZE;
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

  for (let groupNumber = 1; groupNumber <= MIXED_GROUP_COUNT; groupNumber += 1) {
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
          apparatus: buildMixedGroupProfile(rng),
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
): Record<string, Team> =>
  teamBlueprints.reduce<Record<string, Team>>((accumulator, team) => {
    const names = [...(countryNames[team.countryId] || [])];
    accumulator[team.countryId] = {
      countryId: team.countryId,
      gymnasts: team.gymnasts.map((gymnast, index) => ({
        id: gymnast.id,
        name: names[index] || `${countryLabel(team.countryId)} Athlete ${index + 1}`,
        countryId: gymnast.countryId,
        apparatus: [...gymnast.apparatus],
      })),
    };
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
): QuickSetupSnapshot["subdivisions"] => {
  const entities = shuffle(
    [...Object.keys(teams), ...Object.keys(mixedGroups)],
    rng,
  );
  const subdivisions = createEmptySubdivisions();

  for (let subdivision = 1; subdivision <= 5; subdivision += 1) {
    const entitySlice = entities.slice((subdivision - 1) * 4, subdivision * 4);
    const apparatusOrder = shuffle([...OFFICIAL_APPARATUS], rng);

    entitySlice.forEach((entityId, index) => {
      subdivisions[subdivision][entityId] = apparatusOrder[index];
    });
  }

  return subdivisions;
};

const buildEntityApparatusOrder = (
  gymnasts: Gymnast[],
  rng: RandomSource,
): QuickSetupSnapshot["apparatusOrder"][string] =>
  OFFICIAL_APPARATUS.reduce<QuickSetupSnapshot["apparatusOrder"][string]>(
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
  rng: RandomSource = Math.random,
): QuickSetupSnapshot["apparatusOrder"] => {
  const order: QuickSetupSnapshot["apparatusOrder"] = {};

  Object.entries(teams).forEach(([countryId, team]) => {
    order[countryId] = buildEntityApparatusOrder(team.gymnasts, rng);
  });

  Object.entries(mixedGroups).forEach(([groupId, group]) => {
    order[groupId] = buildEntityApparatusOrder(group.gymnasts, rng);
  });

  return order;
};

export const validateQuickSetupSnapshot = (snapshot: QuickSetupSnapshot): void => {
  const selectedSet = new Set(snapshot.selectedCountries);
  if (snapshot.selectedCountries.length !== TEAM_COUNT || selectedSet.size !== TEAM_COUNT) {
    throw new Error("Quick setup must select exactly 12 unique team countries.");
  }

  if (Object.keys(snapshot.teams).length !== TEAM_COUNT) {
    throw new Error("Quick setup must create 12 teams.");
  }

  Object.values(snapshot.teams).forEach((team) => {
    if (team.gymnasts.length !== TEAM_SIZE) {
      throw new Error(`Team ${team.countryId} must contain 5 gymnasts.`);
    }

    team.gymnasts.forEach((gymnast) => {
      if (!gymnast.name.trim()) {
        throw new Error(`Gymnast ${gymnast.id} is missing a name.`);
      }
      if (gymnast.apparatus.includes("VT") && gymnast.apparatus.includes("VT*")) {
        throw new Error(`Gymnast ${gymnast.id} cannot compete both VT and VT*.`);
      }
    });

    const counts = {
      VT: team.gymnasts.filter((gymnast) => competesOnApparatus(gymnast, "VT")).length,
      UB: team.gymnasts.filter((gymnast) => competesOnApparatus(gymnast, "UB")).length,
      BB: team.gymnasts.filter((gymnast) => competesOnApparatus(gymnast, "BB")).length,
      FX: team.gymnasts.filter((gymnast) => competesOnApparatus(gymnast, "FX")).length,
    };

    OFFICIAL_APPARATUS.forEach((apparatus) => {
      if (counts[apparatus] < 3 || counts[apparatus] > 4) {
        throw new Error(`Team ${team.countryId} has invalid ${apparatus} coverage.`);
      }
    });
  });

  const mixedGroups = Object.values(snapshot.mixedGroups);
  if (mixedGroups.length !== MIXED_GROUP_COUNT) {
    throw new Error("Quick setup must create 8 mixed groups.");
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

  if (mixedTotal !== MIXED_GYMNAST_TOTAL) {
    throw new Error("Quick setup must create exactly 36 mixed-group gymnasts.");
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

  for (let subdivision = 1; subdivision <= 5; subdivision += 1) {
    const entries = Object.entries(snapshot.subdivisions[subdivision] || {});
    if (entries.length !== 4) {
      throw new Error(`Subdivision ${subdivision} must contain 4 entities.`);
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

    OFFICIAL_APPARATUS.forEach((apparatus) => {
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
  fetchImpl = fetch,
  rng = Math.random,
  maxAttempts = MAX_GENERATION_ATTEMPTS,
}: {
  fetchImpl?: FetchLike;
  rng?: RandomSource;
  maxAttempts?: number;
} = {}): Promise<QuickSetupSnapshot> => {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const selectedCountries = pickSelectedCountries(rng);
      const teamBlueprints = buildTeamsBlueprint(selectedCountries, rng);
      const mixedGroupBlueprints = buildMixedGroupsBlueprint(selectedCountries, rng);
      const countryCounts = countGymnastsByCountry(teamBlueprints, mixedGroupBlueprints);
      const countryNames = await resolveCountryNames(countryCounts, fetchImpl);
      const teams = materializeTeams(teamBlueprints, countryNames);
      const mixedGroups = materializeMixedGroups(mixedGroupBlueprints, countryNames);
      const subdivisions = drawSubdivisions(teams, mixedGroups, rng);
      const apparatusOrder = buildApparatusOrder(teams, mixedGroups, rng);

      const snapshot: QuickSetupSnapshot = {
        phase: 5,
        selectedCountries,
        teams,
        mixedGroups,
        subdivisions,
        apparatusOrder,
        scores: {},
        dns: {},
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
