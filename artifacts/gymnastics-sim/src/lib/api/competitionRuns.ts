import type {
  CompetitionRunRecord,
  CreateCompetitionRunInput,
  SaveCompetitionSnapshotInput,
  SaveCompetitionSnapshotResult,
} from "@workspace/sim-core";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

class ApiRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const buildApiUrl = (path: string): string =>
  `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

const apiRequest = async <T>(
  path: string,
  init?: RequestInit,
): Promise<T> => {
  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`;

    try {
      const data = await response.json() as { message?: string };
      if (data.message) {
        message = data.message;
      }
    } catch {
      // Ignore parse errors and keep the default message.
    }

    throw new ApiRequestError(response.status, message);
  }

  return response.json() as Promise<T>;
};

export const createRemoteCompetitionRun = (
  payload: CreateCompetitionRunInput,
): Promise<CompetitionRunRecord> =>
  apiRequest<CompetitionRunRecord>("/api/competition-runs", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const saveRemoteCompetitionSnapshot = (
  runId: string,
  payload: SaveCompetitionSnapshotInput,
): Promise<SaveCompetitionSnapshotResult> =>
  apiRequest<SaveCompetitionSnapshotResult>(`/api/competition-runs/${runId}/snapshot`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export { ApiRequestError };
