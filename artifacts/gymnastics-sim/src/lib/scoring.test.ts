import { describe, expect, it } from "vitest";

import { getTeamApparatusResult } from "./scoring";
import { DnsMap, QualificationStandByUsage, ScoreMap, Team } from "./types";

describe("getTeamApparatusResult", () => {
  it("counts an activated standby score in the team top 3 when it beats a titular", () => {
    const team: Team = {
      countryId: "BRA",
      rosterFormat: 5,
      gymnasts: [
        {
          id: "t1",
          name: "Titular 1",
          countryId: "BRA",
          apparatus: ["BB"],
          teamAssignments: { BB: "titular" },
        },
        {
          id: "t2",
          name: "Titular 2",
          countryId: "BRA",
          apparatus: ["BB"],
          teamAssignments: { BB: "titular" },
        },
        {
          id: "t3",
          name: "Titular 3",
          countryId: "BRA",
          apparatus: ["BB"],
          teamAssignments: { BB: "titular" },
        },
        {
          id: "t4",
          name: "Titular DNS",
          countryId: "BRA",
          apparatus: ["BB"],
          teamAssignments: { BB: "titular" },
        },
        {
          id: "sb1",
          name: "Stand By",
          countryId: "BRA",
          apparatus: [],
          teamAssignments: { BB: "standby" },
        },
      ],
    };

    const scores: ScoreMap = {
      t1: { BB: { d: 5.1, e: 8.2, penalty: 0, total: 13.3 } },
      t2: { BB: { d: 4.9, e: 8.0, penalty: 0, total: 12.9 } },
      t3: { BB: { d: 4.6, e: 7.7, penalty: 0, total: 12.3 } },
      sb1: { BB: { d: 4.8, e: 7.9, penalty: 0, total: 12.7 } },
    };

    const dns: DnsMap = {
      t4: { BB: true },
    };

    const usage: QualificationStandByUsage = {
      BRA: {
        BB: {
          standbyGymnastId: "sb1",
          activated: true,
        },
      },
    };

    const result = getTeamApparatusResult(team, "BB", scores, dns, usage);

    expect(result.countedScores).toEqual([13.3, 12.9, 12.7]);
    expect(result.score).toBe(38.9);
    expect(result.resultState).toBe("OK");
  });
});
