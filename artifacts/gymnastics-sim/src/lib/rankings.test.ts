import { describe, expect, it } from "vitest";

import { getEventFinalRankings } from "./rankings";
import { Gymnast, ScoreMap, Team } from "./types";

const createVaultGymnast = (
  id: string,
  name: string,
  apparatus: Gymnast["apparatus"],
): Gymnast => ({
  id,
  name,
  countryId: "BRA",
  apparatus,
});

describe("getEventFinalRankings", () => {
  it("keeps single-vault gymnasts out of the VT qualification ranking", () => {
    const allGymnasts: Gymnast[] = [
      createVaultGymnast("vt_single", "Single Vault", ["VT"]),
      createVaultGymnast("vt_double", "Double Vault", ["VT*"]),
    ];
    const scores: ScoreMap = {
      vt_single: {
        VT: { d: 5.0, e: 8.6, penalty: 0, total: 13.6 },
      },
      vt_double: {
        "VT*": [
          { d: 5.1, e: 8.5, penalty: 0, total: 13.6 },
          { d: 5.2, e: 8.6, penalty: 0, total: 13.8 },
        ],
      },
    };

    const rankings = getEventFinalRankings(allGymnasts, "VT", scores, {});

    expect(rankings.map((row) => row.gymnast.id)).toEqual(["vt_double"]);
    expect(rankings[0].total).toBe(13.7);
  });

  it("still allows VT* titulares to rank while excluding single-vault teammates", () => {
    const team: Team = {
      countryId: "BRA",
      rosterFormat: 5,
      gymnasts: [
        {
          id: "team_vt_single",
          name: "Team Single",
          countryId: "BRA",
          apparatus: ["VT"],
          teamAssignments: { VT: "titular" },
        },
        {
          id: "team_vt_double",
          name: "Team Double",
          countryId: "BRA",
          apparatus: ["VT*"],
          teamAssignments: { VT: "titular" },
        },
      ],
    };
    const scores: ScoreMap = {
      team_vt_single: {
        VT: { d: 5.0, e: 8.4, penalty: 0, total: 13.4 },
      },
      team_vt_double: {
        "VT*": [
          { d: 5.2, e: 8.5, penalty: 0, total: 13.7 },
          { d: 5.1, e: 8.6, penalty: 0, total: 13.7 },
        ],
      },
    };

    const rankings = getEventFinalRankings(
      team.gymnasts,
      "VT",
      scores,
      {},
      { BRA: team },
      {},
    );

    expect(rankings.map((row) => row.gymnast.id)).toEqual(["team_vt_double"]);
    expect(rankings[0].status).toBe("Q");
  });
});
