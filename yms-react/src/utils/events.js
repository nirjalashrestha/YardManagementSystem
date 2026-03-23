export const DASHBOARD_REFRESH = "dashboard_refresh";

export function triggerDashboardRefresh() {
  window.dispatchEvent(new Event(DASHBOARD_REFRESH));
}