import { useState } from "react";

import {
  formatScoreField,
  normalizeScoreInput,
  sanitizeScoreInput,
} from "@/features/shared/utils/scoreInput";

interface CommitDraftOptions {
  fieldKey: string;
  storedValue?: number;
  onCommit: (value: number) => void;
}

export const useScoreDraftFields = () => {
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const getInputValue = (fieldKey: string, storedValue?: number): string => {
    if (fieldKey in drafts) {
      return drafts[fieldKey];
    }

    return storedValue === undefined ? "" : formatScoreField(storedValue);
  };

  const updateDraft = (fieldKey: string, rawValue: string): void => {
    setDrafts((current) => ({
      ...current,
      [fieldKey]: sanitizeScoreInput(rawValue),
    }));
  };

  const clearDraft = (fieldKey: string): void => {
    setDrafts((current) => {
      if (!(fieldKey in current)) return current;

      const next = { ...current };
      delete next[fieldKey];
      return next;
    });
  };

  const resetDrafts = (): void => {
    setDrafts({});
  };

  const commitDraft = ({ fieldKey, storedValue, onCommit }: CommitDraftOptions): void => {
    const draftValue = drafts[fieldKey];
    if (draftValue === undefined) return;

    if (draftValue.trim() === "") {
      if (storedValue !== undefined) {
        onCommit(0);
      }
      clearDraft(fieldKey);
      return;
    }

    const normalized = normalizeScoreInput(draftValue);
    if (!normalized) {
      clearDraft(fieldKey);
      return;
    }

    onCommit(normalized.numericValue);
    clearDraft(fieldKey);
  };

  return {
    drafts,
    getInputValue,
    updateDraft,
    clearDraft,
    commitDraft,
    resetDrafts,
  };
};
