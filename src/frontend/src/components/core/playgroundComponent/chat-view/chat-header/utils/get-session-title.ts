export function getSessionTitle(
  currentSessionId?: string,
  currentFlowId?: string,
  defaultSessionLabel?: string,
): string {
  if (!currentSessionId || currentSessionId === currentFlowId) {
    return defaultSessionLabel ?? "";
  }
  return currentSessionId;
}
