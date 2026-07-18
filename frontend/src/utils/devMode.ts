export const isDevBuild = import.meta.env.DEV

export function isDeveloperModeVisible(): boolean {
  return isDevBuild
}
