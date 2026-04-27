import { normalizeMixedGroupsForDiscipline } from "@/lib/mixedGroups";
import { MixedGroup } from "@/lib/types";

describe("normalizeMixedGroupsForDiscipline", () => {
  it("preserves compatible mixed-group membership while normalizing apparatus", () => {
    const groups: Record<string, MixedGroup> = {
      MG1: {
        id: "MG1",
        name: "Mixed Group 1",
        gymnasts: [
          {
            id: "g1",
            name: "Gymnast 1",
            countryId: "BRA",
            apparatus: ["UB", "BB"],
            isMixedGroup: true,
            mixedGroupId: "MG1",
          },
        ],
      },
      MG2: {
        id: "MG2",
        name: "Mixed Group 2",
        gymnasts: [
          {
            id: "g2",
            name: "Gymnast 2",
            countryId: "USA",
            apparatus: ["FX", "VT"],
            isMixedGroup: true,
            mixedGroupId: "MG2",
          },
        ],
      },
      MG3: { id: "MG3", name: "Mixed Group 3", gymnasts: [] },
      MG4: { id: "MG4", name: "Mixed Group 4", gymnasts: [] },
      MG5: { id: "MG5", name: "Mixed Group 5", gymnasts: [] },
      MG6: { id: "MG6", name: "Mixed Group 6", gymnasts: [] },
    };

    const normalized = normalizeMixedGroupsForDiscipline(groups, "MAG");

    expect(normalized.MG1.gymnasts.map((gymnast) => gymnast.id)).toEqual(["g1"]);
    expect(normalized.MG2.gymnasts.map((gymnast) => gymnast.id)).toEqual(["g2"]);
    expect(normalized.MG1.gymnasts[0].apparatus).toEqual(["FX", "PH", "SR", "VT", "PB", "HB"]);
    expect(normalized.MG2.gymnasts[0].mixedGroupId).toBe("MG2");
  });
});
