export type { Profile, ConnectionStatus, TestConnectionResult } from "./stores/connection";

export {
  useConnectionStore,
  selectProfiles,
  selectActiveProfileId,
  selectActiveProfile,
  selectActions,
} from "./stores/connection";

export type { Theme } from "./stores/theme";
export { useThemeStore, selectTheme, selectThemeActions } from "./stores/theme";

export { useSidebarStore, selectSidebarCollapsed, selectSidebarActions } from "./stores/sidebar";

import { useConnectionStore, selectActiveProfile } from "./stores/connection";

export function useActiveProfile() {
  return useConnectionStore(selectActiveProfile);
}
