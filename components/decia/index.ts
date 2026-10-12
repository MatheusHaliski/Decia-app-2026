// DECIA — Decision Card e Decision Workspace (docs/decia/04_DECISION_CARD.md §9, 05_WORKSPACE_E_NAVEGACAO.md; RF29).
export { AiSuggestion } from "./AiSuggestion";
export type { AiSuggestionProps } from "./AiSuggestion";
export { DecisionTimeline, SensitivityPanel, TradeOffView } from "./Analysis";
export { ConfidenceIndicator, DecisionStatusBadge, EvidenceStrengthBadge, FreshnessBadge, HelpHint, LevelChip, RiskBadge, StatementNatureChip } from "./Badges";
export type { StatementNature } from "./Badges";
export { CriteriaMatrix } from "./CriteriaMatrix";
export type { CriteriaMatrixProps } from "./CriteriaMatrix";
export { DecisionCard, DecisionCardBack, DecisionCardFront } from "./DecisionCard";
export type { DecisionCardProps } from "./DecisionCard";
export { AddAlternativeDialog, AddEvidenceDialog, CHALLENGE_MODES, ChallengeDialog, DecideDialog, RecordOutcomeDialog } from "./Dialogs";
export { DecisionWorkspace } from "./DecisionWorkspace";
export type { DecisionWorkspaceProps } from "./DecisionWorkspace";
export { formatDay, formatScore, useMediaQuery, useMounted, useNow, useReducedMotion } from "./hooks";
export { ReadinessCheck, ReadinessSummary } from "./ReadinessCheck";
export { AttentionInbox, DecisionsBoard, filterDecisions, inboxGroups, NewDecisionDialog, ReviewsView, workspaceHref } from "./Views";
export { CompareSection, DecisionSection, EvidenceSection, ExecutionSection, OverviewSection, RisksSection } from "./WorkspaceSections";
