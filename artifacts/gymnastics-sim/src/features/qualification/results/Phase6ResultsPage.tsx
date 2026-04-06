import { ChevronLeft, Trophy } from "lucide-react";

import { PageHero } from "@/components/simulation/layout/PageHero";
import { PageShell } from "@/components/simulation/layout/PageShell";

import { useQualificationResultsController } from "./hooks/useQualificationResultsController";
import { FinalsLaunchPanel } from "./components/FinalsLaunchPanel";
import { QualificationResultsTable } from "./components/QualificationResultsTable";
import { ResultsTabs } from "./components/ResultsTabs";

export default function Phase6ResultsPage() {
  const {
    activeTab,
    setActiveTab,
    rankings,
    orderedTeamApparatusRanking,
    finalsAvailability,
    openFinal,
    goBackToScoring,
  } = useQualificationResultsController();

  const selectedIndividualRanking =
    activeTab === "AA" || activeTab === "VT" || activeTab === "UB" || activeTab === "BB" || activeTab === "FX"
      ? rankings[activeTab]
      : [];

  return (
    <PageShell width="medium">
      <div className="relative">
        <button
          type="button"
          onClick={goBackToScoring}
          className="absolute left-0 top-10 flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-white"
        >
          <ChevronLeft className="h-5 w-5" /> Scoring
        </button>
      </div>

      <PageHero
        align="center"
        icon={<Trophy className="h-8 w-8 text-slate-950" />}
        title="QUALIFICATION RESULTS"
        description="Qualification rankings for teams, all-around and apparatus events."
      />

      <ResultsTabs activeTab={activeTab} onChange={setActiveTab} />

      <FinalsLaunchPanel
        teamFinalMessage={finalsAvailability.teamFinalMessage}
        allAroundFinalMessage={finalsAvailability.allAroundFinalMessage}
        canOpenTeamFinal={finalsAvailability.canOpenTeamFinal}
        canOpenAllAroundFinal={finalsAvailability.canOpenAllAroundFinal}
        teamStats={[
          `${finalsAvailability.teamFinalPool.qualified.length} qualified teams`,
          `${finalsAvailability.teamFinalPool.reserves.length} reserves`,
        ]}
        allAroundStats={[
          `${finalsAvailability.allAroundFinalPool.qualified.length} finalists`,
          `${finalsAvailability.allAroundFinalPool.reserves.length} reserves`,
          ...(!finalsAvailability.qualificationCompletion.isComplete
            && finalsAvailability.qualificationCompletion.missingRoutineCount > 0
            ? [
                `Missing ${finalsAvailability.qualificationCompletion.missingRoutineCount} routines to unlock`,
              ]
            : []),
        ]}
        onOpenTeamFinal={() => openFinal("/finals/team", finalsAvailability.canOpenTeamFinal)}
        onOpenAllAroundFinal={() =>
          openFinal("/finals/all-around", finalsAvailability.canOpenAllAroundFinal)
        }
      />

      <QualificationResultsTable
        activeTab={activeTab}
        teamRows={rankings.TEAM}
        individualRows={selectedIndividualRanking}
        teamApparatusRows={orderedTeamApparatusRanking}
      />
    </PageShell>
  );
}
