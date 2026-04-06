import { PageShell } from "@/components/simulation/layout/PageShell";

import { ApparatusPanel } from "./components/ApparatusPanel";
import { ScoringToolbar } from "./components/ScoringToolbar";
import { useQualificationScoringController } from "./hooks/useQualificationScoringController";

export default function Phase5ScoringPage() {
  const controller = useQualificationScoringController();

  return (
    <PageShell width="wide">
      <ScoringToolbar
        activeSub={controller.activeSub}
        onSubChange={controller.setActiveSub}
        activeRot={controller.activeRot}
        onRotChange={controller.setActiveRot}
        onFinish={controller.handleFinish}
      />

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        {controller.apparatusOrder.map((apparatus) => (
          <ApparatusPanel
            key={apparatus}
            apparatus={apparatus}
            entities={controller.entitiesByApparatus[apparatus]}
            getDnsKey={controller.getDnsEntryKeyForApp}
            isDnsActive={(gymnastId, key) => controller.isDnsActive(controller.state.dns, gymnastId, key)}
            getStoredScore={controller.getStoredScore}
            getInputValue={controller.getScoreValue}
            updateDraft={controller.updateScoreDraft}
            onBlur={controller.handleScoreBlur}
            onToggleDns={controller.handleToggleDns}
            getRank={controller.getGymnastRank}
            isRankIndicatorActive={controller.isRankIndicatorActive}
          />
        ))}
      </div>
    </PageShell>
  );
}
