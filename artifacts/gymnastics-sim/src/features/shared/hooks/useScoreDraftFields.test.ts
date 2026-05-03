import { describe, expect, it } from "vitest";

import { act, renderHook } from "@testing-library/react";

import { useScoreDraftFields } from "./useScoreDraftFields";

describe("useScoreDraftFields", () => {
  it("sanitizes commas and limits to three decimals", () => {
    const { result } = renderHook(() => useScoreDraftFields());

    act(() => {
      result.current.updateDraft("field", "d", "12,34567");
    });

    expect(result.current.getInputValue("field")).toBe("12.345");
  });

  it("clamps e-score drafts above 10.000 immediately", () => {
    const { result } = renderHook(() => useScoreDraftFields());

    act(() => {
      result.current.updateDraft("field", "e", "11.");
    });

    expect(result.current.getInputValue("field")).toBe("10.000");
  });

  it("keeps valid e-scores formatted to three decimals", () => {
    const { result } = renderHook(() => useScoreDraftFields());

    act(() => {
      result.current.updateDraft("field", "e", "9,866");
    });

    expect(result.current.getInputValue("field")).toBe("9.866");
  });

  it("does not clamp d-score drafts above 10.000", () => {
    const { result } = renderHook(() => useScoreDraftFields());

    act(() => {
      result.current.updateDraft("field", "d", "11.");
    });

    expect(result.current.getInputValue("field")).toBe("11.");
  });

  it("commits zero when a stored field is cleared", () => {
    const { result } = renderHook(() => useScoreDraftFields());
    let committedValue: number | null = null;

    act(() => {
      result.current.updateDraft("field", "e", "");
    });

    act(() => {
      result.current.commitDraft({
        fieldKey: "field",
        field: "e",
        storedValue: 13.2,
        onCommit: (value) => {
          committedValue = value;
        },
      });
    });

    expect(committedValue).toBe(0);
    expect(result.current.getInputValue("field", 13.2)).toBe("13.200");
  });

  it("drops an invalid draft without committing", () => {
    const { result } = renderHook(() => useScoreDraftFields());
    let commitCount = 0;

    act(() => {
      result.current.updateDraft("field", "e", "abc");
    });

    act(() => {
      result.current.commitDraft({
        fieldKey: "field",
        field: "e",
        onCommit: () => {
          commitCount += 1;
        },
      });
    });

    expect(commitCount).toBe(0);
    expect(result.current.getInputValue("field")).toBe("");
  });

  it("keeps empty fields blank until blur", () => {
    const { result } = renderHook(() => useScoreDraftFields());

    act(() => {
      result.current.updateDraft("field", "e", "");
    });

    expect(result.current.getInputValue("field")).toBe("");
  });

  it("clamps e-score on commit as a defensive fallback", () => {
    const { result } = renderHook(() => useScoreDraftFields());
    let committedValue: number | null = null;

    act(() => {
      result.current.updateDraft("field", "d", "10.333");
    });

    act(() => {
      result.current.commitDraft({
        fieldKey: "field",
        field: "e",
        onCommit: (value) => {
          committedValue = value;
        },
      });
    });

    expect(committedValue).toBe(10);
  });
});
