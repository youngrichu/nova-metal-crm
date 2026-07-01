// Falls back to the version.json committed in this repo's default branch so
// "Check for Updates" works without any VERSION_CHECK_URL configuration.
// Production Windows installs override this via install.ps1 -> VERSION_CHECK_URL.
export const DEFAULT_VERSION_CHECK_URL =
  'https://raw.githubusercontent.com/youngrichu/nova-metal-crm/main/version.json';
