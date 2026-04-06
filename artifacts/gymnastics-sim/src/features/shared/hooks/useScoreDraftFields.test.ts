import { act, renderHook } from "@testing-library/react";

import { useScoreDraftFields } from "./useScoreDraftFields";

describe("useScoreDraftFields", () => {
  it("sanitizes commas and limits to three decimals", () => {
    const { result } = renderHook(() => useScoreDraftFields());

    act(() => {
      result.current.updateDraft("field", "12,34567");
    });

    expect(result.current.getInputValue("field")).toBe("12.345");
  });

  it("commits zero when a stored field is cleared", () => {
    const { result } = renderHook(() => useScoreDraftFields());
    let committedValue: number | null = null;

    act(() => {
      result.current.updateDraft("field", "");
    });

    act(() => {
      result.current.commitDraft({
        fieldKey: "field",
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
      result.current.updateDraft("field", "abc");
    });

    act(() => {
      result.current.commitDraft({
        fieldKey: "field",
        onCommit: () => {
          commitCount += 1;
        },
      });
    });

    expect(commitCount).toBe(0);
    expect(result.current.getInputValue("field")).toBe("");
  });
});
