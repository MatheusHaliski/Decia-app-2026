// Rede social do Work Station (RF6, RF14–RF19, RF27, RF38 cards): componentes sobre lib/social (regras puras + view
// models + repositório DEMO). Só componentes de components/ui e tokens --ws-*.
export { AssignmentInbox, SocialNotifications } from "./AssignmentInbox";
export { CommentThread } from "./CommentThread";
export { SocialScope, useMounted, useSocial } from "./context";
export type { SocialApi } from "./context";
export { DelegateDialog, GiveBackDialog, ReasonDialog } from "./DelegateDialog";
export { FollowButton } from "./FollowButton";
export { CompanyHeader, DepartmentHeader, PublishedProjects, useCompanyProjects, useDepartmentProjects } from "./InstitutionalHeader";
export { MuralFeed } from "./MuralFeed";
export { CoverArt, Due, PersonLink, Seal, Spark, Stamp, TypeChip, VisibilityTag } from "./Primitives";
export { SocialProfileHeader } from "./ProfileHeader";
export { ProfileView } from "./ProfileView";
export { PhaseBar, ProjectCard } from "./ProjectCard";
export { RemixDialog } from "./RemixDialog";
export { ShareSheet } from "./ShareSheet";
export { ReactionPicker, SocialAction, SocialBar } from "./SocialBar";
export type { SocialBarProps } from "./SocialBar";
export { TaskDetail } from "./TaskDetail";
export { CardGrid, CardList, DelegationLine, StateTag, TaskSchemeCard } from "./TaskSchemeCard";
export type { TaskCardLayout, TaskSchemeCardProps } from "./TaskSchemeCard";
