import {
  createSubdivisionsSkeleton,
  getApparatusForDiscipline,
  getDisciplineConfig,
} from "@/lib/competition";
import { competesOnApparatus } from "@/lib/scoring";
import {
  Apparatus,
  ApparatusKey,
  Discipline,
  MixedGroup,
  SimulationState,
  Team,
} from "@/lib/types";

export const MIN_MIXED_GROUP_SIZE = 2;
export const MAX_MIXED_GROUP_SIZE = 6;

const getMixedGroupOrdinal = (groupId: string): number => {
  const match = /^MG(\d+)$/.exec(groupId);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
};

const getStableGroupOrder = (groups: Record<string, MixedGroup>): MixedGroup[] =>
  Object.values(groups).sort((left, right) => {
    const leftOrdinal = getMixedGroupOrdinal(left.id);
    const rightOrdinal = getMixedGroupOrdinal(right.id);

    if (leftOrdinal !== rightOrdinal) {
      return leftOrdinal - rightOrdinal;
    }

    return left.id.localeCompare(right.id);
  });

const buildNormalizedGroupSizes = (
  totalGymnasts: number,
  groupCount: number,
): number[] => {
  if (groupCount === 0) return [];

  const sizes = Array.from({ length: groupCount }, () => 0);
  const minimumSlots = groupCount * MIN_MIXED_GROUP_SIZE;
  const canGuaranteeMinimum = totalGymnasts >= minimumSlots;

  if (canGuaranteeMinimum) {
    sizes.fill(MIN_MIXED_GROUP_SIZE);
  }

  let remainingGymnasts = totalGymnasts - sizes.reduce((sum, size) => sum + size, 0);
  let cursor = 0;

  while (remainingGymnasts > 0) {
    if (sizes[cursor] < MAX_MIXED_GROUP_SIZE) {
      sizes[cursor] += 1;
      remainingGymnasts -= 1;
    }

    cursor = (cursor + 1) % groupCount;
  }

  return sizes;
};

export const getMixedGroupApparatusOptions = (
  discipline: Discipline,
): Apparatus[] =>
  getApparatusForDiscipline(discipline).flatMap((apparatus) =>
    apparatus === "VT" ? (["VT", "VT*"] as const) : [apparatus],
  );

export const getDefaultMixedGroupGymnastApparatus = (
  discipline: Discipline,
): Apparatus[] => [...getApparatusForDiscipline(discipline)];

export const createEmptyMixedGroups = (
  discipline: Discipline,
): Record<string, MixedGroup> =>
  Array.from(
    { length: getDisciplineConfig(discipline).mixedGroupCount },
    (_, index) => index + 1,
  ).reduce<Record<string, MixedGroup>>((accumulator, ordinal) => {
    const groupId = `MG${ordinal}`;
    accumulator[groupId] = {
      id: groupId,
      name: `Mixed Group ${ordinal}`,
      gymnasts: [],
    };
    return accumulator;
  }, {});

export const normalizeMixedGroupGymnastApparatus = (
  apparatus: Apparatus[] | undefined,
  discipline: Discipline,
): Apparatus[] => {
  const allowedApparatus = new Set(getMixedGroupApparatusOptions(discipline));
  const normalized: Apparatus[] = [];

  for (const entry of apparatus || []) {
    if (!allowedApparatus.has(entry)) continue;

    if (entry === "VT*") {
      const vtIndex = normalized.indexOf("VT");
      if (vtIndex >= 0) {
        normalized.splice(vtIndex, 1);
      }
    }

    if (entry === "VT" && normalized.includes("VT*")) {
      continue;
    }

    if (!normalized.includes(entry)) {
      normalized.push(entry);
    }
  }

  return normalized.length > 0
    ? normalized
    : getDefaultMixedGroupGymnastApparatus(discipline);
};

export const normalizeMixedGroupsForDiscipline = (
  groups: Record<string, MixedGroup>,
  discipline: Discipline,
): Record<string, MixedGroup> => {
  if (Object.keys(groups).length === 0) {
    return {};
  }

  const config = getDisciplineConfig(discipline);
  const maxGymnasts = Math.min(
    config.mixedGymnastTotal,
    config.mixedGroupCount * MAX_MIXED_GROUP_SIZE,
  );
  const flattenedGymnasts = getStableGroupOrder(groups)
    .flatMap((group) => group.gymnasts)
    .slice(0, maxGymnasts)
    .map((gymnast) => ({
      ...gymnast,
      apparatus: normalizeMixedGroupGymnastApparatus(gymnast.apparatus, discipline),
      isMixedGroup: true,
    }));
  const groupSizes = buildNormalizedGroupSizes(
    flattenedGymnasts.length,
    config.mixedGroupCount,
  );
  const normalized = createEmptyMixedGroups(discipline);
  let nextGymnastIndex = 0;

  Object.keys(normalized).forEach((groupId, index) => {
    const groupGymnasts = flattenedGymnasts
      .slice(nextGymnastIndex, nextGymnastIndex + groupSizes[index])
      .map((gymnast) => ({
        ...gymnast,
        isMixedGroup: true,
        mixedGroupId: groupId,
      }));

    normalized[groupId] = {
      ...normalized[groupId],
      gymnasts: groupGymnasts,
    };

    nextGymnastIndex += groupSizes[index];
  });

  return normalized;
};

export const normalizeSubdivisionsForDiscipline = (
  subdivisions: SimulationState["subdivisions"] | undefined,
  discipline: Discipline,
  validEntityIds: Iterable<string>,
): SimulationState["subdivisions"] => {
  const validEntityIdSet = new Set(validEntityIds);
  const validApparatus = new Set(getApparatusForDiscipline(discipline));
  const normalized = createSubdivisionsSkeleton(discipline);

  Object.keys(normalized).forEach((subdivisionId) => {
    const subdivision = Number(subdivisionId);
    const entries = subdivisions?.[subdivision] || {};

    Object.entries(entries).forEach(([entityId, startingApparatus]) => {
      if (!validEntityIdSet.has(entityId)) return;
      if (startingApparatus === "BYE") return;
      if (!validApparatus.has(startingApparatus)) return;

      normalized[subdivision][entityId] = startingApparatus;
    });
  });

  return normalized;
};

export const normalizeApparatusOrderForDiscipline = (
  apparatusOrder: SimulationState["apparatusOrder"] | undefined,
  teams: Record<string, Team>,
  mixedGroups: Record<string, MixedGroup>,
  discipline: Discipline,
): SimulationState["apparatusOrder"] => {
  const normalized: SimulationState["apparatusOrder"] = {};
  const officialApparatus = [...getApparatusForDiscipline(discipline)];
  const entities = {
    ...teams,
    ...mixedGroups,
  };

  Object.entries(entities).forEach(([entityId, entity]) => {
    const savedOrder = apparatusOrder?.[entityId] || {};
    const nextEntityOrder: Partial<Record<ApparatusKey, string[]>> = {};

    officialApparatus.forEach((apparatus) => {
      const eligibleGymnastIds = entity.gymnasts
        .filter((gymnast) => competesOnApparatus(gymnast, apparatus))
        .map((gymnast) => gymnast.id);

      if (eligibleGymnastIds.length === 0) return;

      const eligibleGymnastIdSet = new Set(eligibleGymnastIds);
      const usedGymnastIds = new Set<string>();
      const orderedGymnastIds = (savedOrder[apparatus] || []).filter((gymnastId) => {
        if (!eligibleGymnastIdSet.has(gymnastId) || usedGymnastIds.has(gymnastId)) {
          return false;
        }

        usedGymnastIds.add(gymnastId);
        return true;
      });

      eligibleGymnastIds.forEach((gymnastId) => {
        if (!usedGymnastIds.has(gymnastId)) {
          orderedGymnastIds.push(gymnastId);
        }
      });

      nextEntityOrder[apparatus] = orderedGymnastIds;
    });

    normalized[entityId] = nextEntityOrder;
  });

  return normalized;
};
