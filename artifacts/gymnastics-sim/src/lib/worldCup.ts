import { createApparatusMap, getApparatusForDiscipline } from "@/lib/competition";
import { getCompetitionConfig } from "@/lib/competitionRun";
import { getCompetitionEventRanking } from "@/features/qualification/results/selectors/competitionResultsSelectors";
import { selectAllGymnasts } from "@/lib/simulation/selectors";
import {
  ApparatusKey,
  Gymnast,
  SimulationState,
  WorldCupApparatusStanding,
  WorldCupOverallStanding,
  WorldCupSeriesState,
  WorldCupSeriesSummary,
  WorldCupStageApparatusRow,
  WorldCupStageSummary,
} from "@/lib/types";

export const WORLD_CUP_TOTAL_STAGES = 4;

export const WORLD_CUP_POINTS_BY_RANK: Record<number, number> = {
  1: 30,
  2: 25,
  3: 20,
  4: 18,
  5: 16,
  6: 14,
  7: 12,
  8: 10,
  9: 8,
  10: 7,
  11: 6,
  12: 5,
  13: 4,
  14: 3,
  15: 2,
  16: 1,
};

export const getWorldCupPointsForRank = (rank: number | null | undefined): number =>
  rank ? WORLD_CUP_POINTS_BY_RANK[rank] || 0 : 0;

export const createEmptyWorldCupSeriesState = (): WorldCupSeriesState => ({
  currentStageNumber: 1,
  totalStages: WORLD_CUP_TOTAL_STAGES,
  stageHistory: [],
  registry: {},
});

export const isWorldCupCompetition = (state: SimulationState): boolean =>
  getCompetitionConfig(state).competitionKind === "WORLD_CUP";

export const mergeWorldCupRegistry = (
  registry: Record<string, Gymnast>,
  teams: Record<string, { gymnasts: Gymnast[] }>,
): Record<string, Gymnast> => {
  const next = { ...registry };

  Object.values(teams).forEach((team) => {
    team.gymnasts.forEach((gymnast) => {
      next[gymnast.id] = gymnast;
    });
  });

  return next;
};

const createGymnastLookup = (state: SimulationState): Map<string, Gymnast> => {
  const lookup = new Map<string, Gymnast>();

  Object.values(state.worldCupSeries.registry).forEach((gymnast) => {
    lookup.set(gymnast.id, gymnast);
  });

  selectAllGymnasts(state).forEach((gymnast) => {
    lookup.set(gymnast.id, gymnast);
  });

  return lookup;
};

const buildStageRows = (
  state: SimulationState,
  apparatus: ApparatusKey,
): WorldCupStageApparatusRow[] =>
  getCompetitionEventRanking(state, apparatus).map((row, index) => {
    const rank = row.rank ?? index + 1;

    return {
      gymnastId: row.gymnast.id,
      gymnastName: row.gymnast.name,
      countryId: row.gymnast.countryId,
      apparatus,
      rank,
      points: getWorldCupPointsForRank(rank),
      resultState: row.resultState,
      isFinalist: rank <= 8,
    };
  });

export const buildWorldCupStageSummary = (
  state: SimulationState,
): WorldCupStageSummary => {
  const competitionConfig = getCompetitionConfig(state);
  if (competitionConfig.competitionKind !== "WORLD_CUP") {
    throw new Error("World Cup stage summaries can only be built for World Cup competitions.");
  }

  const apparatusList = [...getApparatusForDiscipline(state.discipline)];
  const apparatusRankings = createApparatusMap((apparatus) =>
    apparatusList.includes(apparatus)
      ? buildStageRows(state, apparatus)
      : [],
  );

  return {
    stageNumber: state.worldCupSeries.currentStageNumber,
    stageLabel: `Stage ${state.worldCupSeries.currentStageNumber}`,
    completedAt: new Date().toISOString(),
    apparatusRankings,
  };
};

const collectStageSummaries = (
  state: SimulationState,
  includePendingCurrentStage: boolean,
): WorldCupStageSummary[] => {
  const recorded = [...state.worldCupSeries.stageHistory].sort(
    (left, right) => left.stageNumber - right.stageNumber,
  );

  if (!includePendingCurrentStage) {
    return recorded;
  }

  const currentStageNumber = state.worldCupSeries.currentStageNumber;
  if (recorded.some((stage) => stage.stageNumber === currentStageNumber)) {
    return recorded;
  }

  return [...recorded, buildWorldCupStageSummary(state)].sort(
    (left, right) => left.stageNumber - right.stageNumber,
  );
};

const buildWorldCupApparatusStandings = (
  state: SimulationState,
  summaries: WorldCupStageSummary[],
  gymnastLookup: Map<string, Gymnast>,
): Record<ApparatusKey, WorldCupApparatusStanding[]> => {
  const totals = createApparatusMap(
    () =>
      new Map<
        string,
        {
          gymnastId: string;
          totalPoints: number;
          stagePoints: number[];
        }
      >(),
  );

  summaries.forEach((summary) => {
    getApparatusForDiscipline(state.discipline).forEach((apparatus) => {
      summary.apparatusRankings[apparatus].forEach((row) => {
        const current = totals[apparatus].get(row.gymnastId) || {
          gymnastId: row.gymnastId,
          totalPoints: 0,
          stagePoints: [],
        };

        current.totalPoints += row.points;
        current.stagePoints.push(row.points);
        totals[apparatus].set(row.gymnastId, current);
      });
    });
  });

  const standings = createApparatusMap<WorldCupApparatusStanding[]>((apparatus) => {
    const rows = [...totals[apparatus].values()]
      .map((entry) => {
        const gymnast = gymnastLookup.get(entry.gymnastId);
        return gymnast
          ? {
              gymnastId: gymnast.id,
              gymnast,
              totalPoints: entry.totalPoints,
              stagePoints: [...entry.stagePoints],
              rank: 0,
              tied: false,
              qualifiedForWorlds: false,
            }
          : null;
      })
      .filter((row): row is WorldCupApparatusStanding => Boolean(row))
      .sort((left, right) => {
        if (right.totalPoints !== left.totalPoints) {
          return right.totalPoints - left.totalPoints;
        }

        return left.gymnast.name.localeCompare(right.gymnast.name);
      });

    rows.forEach((row, index) => {
      if (index === 0) {
        row.rank = 1;
        return;
      }

      const previous = rows[index - 1];
      if (previous.totalPoints === row.totalPoints) {
        row.rank = previous.rank;
        row.tied = true;
        previous.tied = true;
        return;
      }

      row.rank = index + 1;
    });

    rows.forEach((row) => {
      row.qualifiedForWorlds = row.rank <= 8;
    });

    return rows;
  });

  return standings;
};

const buildWorldCupOverallStandings = (
  state: SimulationState,
  summaries: WorldCupStageSummary[],
  gymnastLookup: Map<string, Gymnast>,
  apparatusStandings: Record<ApparatusKey, WorldCupApparatusStanding[]>,
): WorldCupOverallStanding[] => {
  const overallTotals = new Map<
    string,
    {
      gymnastId: string;
      pointsByApparatus: Record<ApparatusKey, number>;
    }
  >();

  summaries.forEach((summary) => {
    getApparatusForDiscipline(state.discipline).forEach((apparatus) => {
      summary.apparatusRankings[apparatus].forEach((row) => {
        const entry = overallTotals.get(row.gymnastId) || {
          gymnastId: row.gymnastId,
          pointsByApparatus: createApparatusMap(() => 0),
        };

        entry.pointsByApparatus[apparatus] += row.points;
        overallTotals.set(row.gymnastId, entry);
      });
    });
  });

  const rows = [...overallTotals.values()]
    .map((entry) => {
      const gymnast = gymnastLookup.get(entry.gymnastId);
      if (!gymnast) return null;

      const totalPoints = Object.values(entry.pointsByApparatus).reduce(
        (sum, value) => sum + value,
        0,
      );

      return {
        gymnastId: gymnast.id,
        gymnast,
        pointsByApparatus: entry.pointsByApparatus,
        totalPoints,
        rank: 0,
        tied: false,
        qualifiedApparatuses: [] as ApparatusKey[],
      };
    })
    .filter((row): row is WorldCupOverallStanding => Boolean(row))
    .sort((left, right) => {
      if (right.totalPoints !== left.totalPoints) {
        return right.totalPoints - left.totalPoints;
      }

      return left.gymnast.name.localeCompare(right.gymnast.name);
    });

  rows.forEach((row, index) => {
    if (index === 0) {
      row.rank = 1;
      return;
    }

    const previous = rows[index - 1];
    if (previous.totalPoints === row.totalPoints) {
      row.rank = previous.rank;
      row.tied = true;
      previous.tied = true;
      return;
    }

    row.rank = index + 1;
  });

  rows.forEach((row) => {
    row.qualifiedApparatuses = getApparatusForDiscipline(state.discipline).filter((apparatus) =>
      Boolean(apparatusStandings[apparatus].find((standing) => standing.gymnastId === row.gymnastId && standing.rank <= 8)),
    );
  });

  return rows;
};

export const getWorldCupSeriesSummary = (
  state: SimulationState,
  includePendingCurrentStage = true,
): WorldCupSeriesSummary => {
  const summaries = collectStageSummaries(state, includePendingCurrentStage);
  const gymnastLookup = createGymnastLookup(state);
  const apparatusStandings = buildWorldCupApparatusStandings(state, summaries, gymnastLookup);
  const overallStandings = buildWorldCupOverallStandings(
    state,
    summaries,
    gymnastLookup,
    apparatusStandings,
  );

  const apparatusChampions = createApparatusMap<WorldCupApparatusStanding | null>((apparatus) =>
    apparatusStandings[apparatus][0] || null,
  );

  const qualifiedApparatusesByGymnastId = overallStandings.reduce<Record<string, ApparatusKey[]>>(
    (accumulator, row) => {
      accumulator[row.gymnastId] = row.qualifiedApparatuses;
      return accumulator;
    },
    {},
  );

  return {
    stageNumber: state.worldCupSeries.currentStageNumber,
    stageLabel: `Stage ${state.worldCupSeries.currentStageNumber}`,
    totalStages: state.worldCupSeries.totalStages,
    isCurrentStageRecorded: state.worldCupSeries.stageHistory.some(
      (stage) => stage.stageNumber === state.worldCupSeries.currentStageNumber,
    ),
    apparatusStandings,
    apparatusChampions,
    overallStandings,
    qualifiedApparatusesByGymnastId,
  };
};

export const getWorldCupStageCompletionLabel = (state: SimulationState): string => {
  const summary = getWorldCupSeriesSummary(state);
  if (summary.isCurrentStageRecorded && summary.stageNumber >= summary.totalStages) {
    return "World Cup complete";
  }

  if (summary.isCurrentStageRecorded) {
    return `Stage ${summary.stageNumber} recorded. Ready for Stage ${summary.stageNumber + 1}.`;
  }

  return `Stage ${summary.stageNumber} ready to record.`;
};
