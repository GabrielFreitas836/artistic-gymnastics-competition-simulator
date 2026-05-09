import { ChevronLeft, Trophy } from "lucide-react";

import { PageHero } from "@/components/simulation/layout/PageHero";
import { PageShell } from "@/components/simulation/layout/PageShell";
import { ApparatusKey } from "@/lib/types";

import { useQualificationResultsController } from "./hooks/useQualificationResultsController";
import { FinalsLaunchPanel } from "./components/FinalsLaunchPanel";
import { QualificationResultsTable } from "./components/QualificationResultsTable";
import { ResultsTabs } from "./components/ResultsTabs";

export default function Phase6ResultsPage() {
  const {
    state,
    competitionConfig,
    activeTab,
    setActiveTab,
    rankings,
    apparatusTabs,
    orderedTeamApparatusRanking,
    finalsAvailability,
    openFinal,
    goBackToScoring,
  } = useQualificationResultsController();

  const selectedIndividualRanking =
    activeTab === "AA"
      ? rankings.AA
      : apparatusTabs.includes(activeTab as ApparatusKey)
        ? rankings[activeTab as ApparatusKey] || []
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
        description={
          competitionConfig.competitionKind === "WORLD_CUP"
            ? "Qualification and finals-driven apparatus rankings for the current World Cup."
            : "Qualification rankings for teams, all-around and apparatus events."
        }
      />

      <ResultsTabs
        discipline={state.discipline}
        competitionConfig={competitionConfig}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {competitionConfig.uiCapabilities.supportsFinalsHub && (
        <FinalsLaunchPanel
          discipline={state.discipline}
          competitionConfig={competitionConfig}
          teamFinalMessage={finalsAvailability.teamFinalMessage}
          allAroundFinalMessage={finalsAvailability.allAroundFinalMessage}
          canOpenTeamFinal={finalsAvailability.canOpenTeamFinal}
          canOpenAllAroundFinal={finalsAvailability.canOpenAllAroundFinal}
          teamStats={[
            `${finalsAvailability.teamFinalPool.qualified.length} qualified teams`,
            `${finalsAvailability.teamFinalPool.reserves.length} reserves`,
          ]}
          teamActionLabel={finalsAvailability.teamFinalActionLabel}
          allAroundStats={[
            `${finalsAvailability.allAroundFinalPool.qualified.length} finalists`,
            `${finalsAvailability.allAroundFinalPool.reserves.length} reserves`,
          ]}
          allAroundActionLabel={finalsAvailability.allAroundFinalActionLabel}
          apparatusFinals={finalsAvailability.apparatusFinals}
          onOpenTeamFinal={() => openFinal("/finals/team", finalsAvailability.canOpenTeamFinal)}
          onOpenAllAroundFinal={() =>
            openFinal("/finals/all-around", finalsAvailability.canOpenAllAroundFinal)
          }
          onOpenApparatusFinal={openFinal}
        />
      )}

      <QualificationResultsTable
        discipline={state.discipline}
        activeTab={activeTab}
        teamRows={rankings.TEAM}
        individualRows={selectedIndividualRanking}
        teamApparatusRows={orderedTeamApparatusRanking}
      />
    </PageShell>
  );
}
