import {
  APPARATUS_FINAL_ROUTE,
  MAG_APPARATUS,
  WAG_APPARATUS,
  createSubdivisionsSkeleton,
  getDisciplineConfig,
} from "@/lib/competition";

describe("competition config", () => {
  it("keeps the expected wag profile", () => {
    expect(WAG_APPARATUS).toEqual(["VT", "UB", "BB", "FX"]);
    expect(getDisciplineConfig("WAG").subdivisionCount).toBe(5);
    expect(getDisciplineConfig("WAG").mixedGroupCount).toBe(8);
  });

  it("exposes the expected mag profile", () => {
    expect(MAG_APPARATUS).toEqual(["FX", "PH", "SR", "VT", "PB", "HB"]);
    expect(getDisciplineConfig("MAG").subdivisionCount).toBe(3);
    expect(getDisciplineConfig("MAG").mixedGroupCount).toBe(6);
    expect(APPARATUS_FINAL_ROUTE.PH).toBe("/finals/apparatus/pommel-horse");
  });

  it("builds subdivision skeletons by discipline", () => {
    expect(Object.keys(createSubdivisionsSkeleton("WAG"))).toEqual(["1", "2", "3", "4", "5"]);
    expect(Object.keys(createSubdivisionsSkeleton("MAG"))).toEqual(["1", "2", "3"]);
  });
});
