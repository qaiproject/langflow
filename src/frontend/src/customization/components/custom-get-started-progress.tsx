// =============================================================================
// CustomGetStartedProgress — emptied for Qosmo whitelabel.
// -----------------------------------------------------------------------------
// Upstream renders the "Na start" onboarding card in the left sidebar:
//   - Oznacz repo gwiazdką na GitHub
//   - Dołącz do społeczności Discord
//   - Utwórz pierwszy flow
// All three are Langflow-OSS getting-started hooks — irrelevant for Qosmo
// Premise users who get a productized whitelabeled experience. Returning
// <></> drops the entire card without touching upstream layout code.
//
// The slot signature is preserved (props arg) so upstream callers don't break.
// =============================================================================
import type { Users } from "@/types/api";

export function CustomGetStartedProgress(_props: {
  userData: Users;
  isGithubStarred: boolean;
  isDiscordJoined: boolean;
  handleDismissDialog: () => void;
}) {
  return <></>;
}

export default CustomGetStartedProgress;
