import { normalizeState } from "./simulationPersistence";

describe("normalizeState", () => {
  it("strips legacy __touched metadata from persisted scores", () => {
    const state = normalizeState({
      scores: {
        gymnast1: {
          UB: {
            d: 5.2,
            e: 8.1,
            penalty: 0.3,
            total: 13,
            __touched: { d: true },
          },
        },
      },
      finals: {
        allAroundFinal: {
          slots: [],
          dns: {},
          scores: {
            gymnast1: {
              VT: {
                d: 5,
                e: 8.5,
                penalty: 0,
                total: 13.5,
                __touched: { e: true },
              },
            },
          },
        },
      },
    });

    expect(state.scores.gymnast1?.UB).toEqual({
      d: 5.2,
      e: 8.1,
      penalty: 0.3,
      total: 13,
    });
    expect(state.finals.allAroundFinal.scores.gymnast1?.VT).toEqual({
      d: 5,
      e: 8.5,
      penalty: 0,
      total: 13.5,
    });
  });
});
