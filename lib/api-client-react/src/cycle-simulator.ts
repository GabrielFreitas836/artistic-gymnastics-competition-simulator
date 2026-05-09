import type {
  CompetitionRunRecord,
  CreateCompetitionRunInput,
  CycleDetailResponse,
  CycleDirectoryResponse,
  CycleQuotaSummary,
  SaveCompetitionSnapshotInput,
  SaveCompetitionSnapshotResult,
} from "@workspace/sim-core";

import { customFetch } from "./custom-fetch";

export const getCyclesUrl = () => "/api/cycles";

export const getCycles = async (
  options?: RequestInit,
): Promise<CycleDirectoryResponse> =>
  customFetch<CycleDirectoryResponse>(getCyclesUrl(), {
    ...options,
    method: "GET",
  });

export const getCycleUrl = (
  cycleId: string,
  cycleRunId?: string | null,
): string => {
  const search = cycleRunId ? `?cycleRunId=${encodeURIComponent(cycleRunId)}` : "";
  return `/api/cycles/${cycleId}${search}`;
};

export const getCycle = async (
  cycleId: string,
  cycleRunId?: string | null,
  options?: RequestInit,
): Promise<CycleDetailResponse> =>
  customFetch<CycleDetailResponse>(getCycleUrl(cycleId, cycleRunId), {
    ...options,
    method: "GET",
  });

export const getCycleQuotasUrl = (
  cycleId: string,
  cycleRunId?: string | null,
): string => {
  const search = cycleRunId ? `?cycleRunId=${encodeURIComponent(cycleRunId)}` : "";
  return `/api/cycles/${cycleId}/quotas${search}`;
};

export const getCycleQuotas = async (
  cycleId: string,
  cycleRunId?: string | null,
  options?: RequestInit,
): Promise<CycleQuotaSummary> =>
  customFetch<CycleQuotaSummary>(getCycleQuotasUrl(cycleId, cycleRunId), {
    ...options,
    method: "GET",
  });

export const createCompetitionRunUrl = () => "/api/competition-runs";

export const createCompetitionRun = async (
  payload: CreateCompetitionRunInput,
  options?: RequestInit,
): Promise<CompetitionRunRecord> =>
  customFetch<CompetitionRunRecord>(createCompetitionRunUrl(), {
    ...options,
    method: "POST",
    body: JSON.stringify(payload),
  });

export const getCompetitionRunUrl = (runId: string) => `/api/competition-runs/${runId}`;

export const getCompetitionRun = async (
  runId: string,
  options?: RequestInit,
): Promise<CompetitionRunRecord> =>
  customFetch<CompetitionRunRecord>(getCompetitionRunUrl(runId), {
    ...options,
    method: "GET",
  });

export const saveCompetitionSnapshotUrl = (runId: string) =>
  `/api/competition-runs/${runId}/snapshot`;

export const saveCompetitionSnapshot = async (
  runId: string,
  payload: SaveCompetitionSnapshotInput,
  options?: RequestInit,
): Promise<SaveCompetitionSnapshotResult> =>
  customFetch<SaveCompetitionSnapshotResult>(saveCompetitionSnapshotUrl(runId), {
    ...options,
    method: "PUT",
    body: JSON.stringify(payload),
  });
