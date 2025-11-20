// Helper to detect if running inside Electron desktop app
export function isDesktopApp(): boolean {
  if (typeof window !== 'undefined') {
    // Most reliable: window.process.versions.electron
    // Fallback: userAgent
    return !!(window.process?.versions?.electron) || navigator.userAgent.includes('Electron');
  }
  return false;
}
