export function isPrimaryBreakWindow(search: string): boolean {
  const windowId = new URLSearchParams(search).get("windowId");
  return windowId === null || windowId === "0";
}
