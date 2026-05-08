# Plan: Expand to Full FIG Olympic Cycle Simulator (REVISED)

## TL;DR

Transform the current single-competition Olympic simulator into a complete **FIG Paris 2024 Olympic Cycle simulator** spanning Year -2 through Olympics with **flexible phase pipelines** and **dual scoring modes**. Each competition type (World Cups, Continental Championships, World Championships, Olympics) defines its own phase sequence and scoring aggregation logic.

**Key Decisions:**
- **Persistence:** SQLite (Drizzle) for full multi-year cycle data
- **Architecture:** Meta-competition framework with configurable phase pipelines + dual scoring modes
- **Scope:** All real FIG Paris 2024 rules (World Cups special scoring, Continental variations, etc.)
- **Implementation:** Design architecture FIRST (critical given complexity), then prototype World Cups, scale to Continentals
- **UI:** Dynamic phase navigator per competition; global year/cycle selector
- **Testing:** Complete coverage of all quota rules, scoring modes, competition variants

---

## Architecture Strategy (REVISED)

### Core Insight: Flexible Phase Pipelines

Instead of fixed Phase 1-7, each competition defines:
- **phasePipeline[]** — Dynamic, varies per competition type
- **scoringMode** — How to aggregate qualification vs finals scores
- **finalsConfiguration** — Which finals exist and how they're computed

### World Cups Example
```
phasePipeline: [Rosters, Rotation, Qualification, ApparatusFinals]
scoringMode: "mixed" (positions 1-8 from finals, 9-16 from qualification)
finalsConfiguration: {hasTeamFinal: false, hasAAFinal: false, hasApparatusFinals: true}
specialRules: {
  noTeams: true,
  maxGymnastsPerCountry: 4,
  maxPerApparatus: 2,
  maxGymnastsTotal: 70,
  subdivisions: 2,
  maxMixedGroups: 4,
  maxGymnastsPerMixedGroup: 18,
  qualifiedForFinalPositions: [1, 8],
  qualificationOnlyForNonFinalists: true,
  finalsOnlyForFinalists: true
}
```

### Continental Africa Example
```
phasePipeline: [Teams, Rosters, Qualification, ApparatusFinals]
scoringMode: "qualification_only"
finalsConfiguration: {
  hasTeamFinal: false,
  hasAAFinal: false,
  hasApparatusFinals: true,
  autoComputedFinals: ["TeamFinal", "AAFinal"] // derived from qualification
}
```

### Continental Europe (even year)
```
phasePipeline: [Teams, Rosters, Qualification, TeamFinal, ApparatusFinals]
scoringMode: "mixed" (Team+Apparatus from finals, AA auto-computed from qualification)
finalsConfiguration: {
  hasTeamFinal: true,
  hasAAFinal: false,
  hasApparatusFinals: true,
  autoComputedFinals: ["AAFinal"]
}
```

---

## Implementation Phases

### PHASE 0: Architecture Design & FIG Rule Research
**Goal:** Document all FIG rules + finalize architecture before code

**Deliverables:**
1. FIG_RULES_2024.md — Complete documentation
2. Architecture review — Confirm designs handle all variations
3. Competition config library structure

**Effort:** 2-3 days (research-heavy)
**Blockers:** None; must complete before Phase 1

---

### PHASE 1: Architecture & Database Foundation (3-4 days)
- Drizzle schema with flexible config fields
- New types: Competition, PhaseDefinition, CompetitionConfig
- Backend API endpoints
- Competition config validator

---

### PHASE 2: Scoring Aggregation & Phase Executor (2-3 days)
- ScoringAggregationStrategy interface
- Implementations: QualificationOnly, FinalsBased, Mixed
- PhaseExecutor for dynamic pipeline management

---

### PHASE 3: Refactor Olympic Sim to Framework (2-3 days)
- Wrap existing Phase 1-7 in new Competition framework
- Dynamic phase stepper (reads from phasePipeline)
- Comprehensive regression tests

---

### PHASE 4: World Cups Prototype (4-5 days)
- Full implementation with special scoring (positions 1-8 vs 9-16)
- No team component; every gymnast competes individually
- Support up to 70 gymnasts total, with 4 subdivisions and country limits (4 athletes max per country, 2 per apparatus)
- Integration test end-to-end
- Qualification output adapter

---

### PHASE 5: Continental Championships (15-20 days)
- Implement all 5 continental variants
- Order: Africa → Oceania → Asia → Europe → Pan-America
- Per-continent phase logic + qualification adapters

---

### PHASE 6: World Championships (3-4 days)
- Full WC flow (same as Olympics)
- Team + individual quota outputs

---

### PHASE 7: Quota Aggregation (3-4 days)
- Aggregate across all competitions
- Olympic roster population + reserves

---

### PHASE 8: Testing & Documentation (5-7 days)
- Regression suite
- Per-competition type tests
- FIG rule validation tests

---

### PHASE 9: Release Prep (1-2 days)

---

## Timeline Estimate

**Total: 41-55 days (~8-9 weeks with 1 FT dev)**

With parallelization in Phase 5 (continental variants): **7-8 weeks realistic**

---

## Key Architectural Changes

| Old Model | New Model |
|-----------|-----------|
| Fixed Phase 1-7 | Dynamic phasePipeline per competition |
| Single scoring logic | ScoringMode enum (qualification_only, finals_based, mixed) |
| All competitions have finals | Finals optional/conditional per competition type |
| Generic phase pages | Pages parameterized by phasePipeline |

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Break Olympic sim | Daily regression tests; snapshot comparisons |
| FIG rules incomplete | Phase 0 research + document all rules |
| Architecture too rigid | Phase 0 design review; confirm flexibility |
| Performance | Stress test in Phase 8 |

---

## Success Criteria

✅ Olympic sim identical before/after  
✅ World Cups: special scoring (1-8 vs 9-16) verified  
✅ All 5 Continental variants with correct phases  
✅ Full FIG Paris 2024 rules  
✅ Nominative quota tracking  
✅ Zero breaking changes  
✅ Comprehensive tests  

---

## Next Steps

1. **User approval** on this revised plan
2. **Phase 0** begins: Research FIG rules + finalize architecture
3. **Phase 1** follows: Build schema + types

Ready to proceed?
