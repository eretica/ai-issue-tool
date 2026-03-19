/**
 * Electron GUI apps don't inherit the user's shell PATH.
 * This helper merges common tool paths so that `claude`, `gh`, etc. are found.
 */
export function getShellEnv(): NodeJS.ProcessEnv {
  const defaultPath = process.env.PATH || ''
  const extraPaths = [
    '/opt/homebrew/bin',
    '/usr/local/bin',
    `${process.env.HOME}/.local/bin`,
    `${process.env.HOME}/.bun/bin`,
  ]
  const existing = new Set(defaultPath.split(':'))
  const merged = [...extraPaths.filter((p) => !existing.has(p)), ...existing]
  return { ...process.env, PATH: merged.join(':') }
}
