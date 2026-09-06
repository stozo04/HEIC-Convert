# HEIC-Convert project instructions

Read README.md for setup and .github/workflows/deploy.yml before deployment work. This React 19 / TypeScript / Vite application converts images entirely in the browser; preserve local processing, no uploads or accounts, IndexedDB history, format selection, and ZIP downloads.

Use existing dependencies and scripts. Run npm run lint for changes; it checks shared skills before TypeScript. Run npm run build when build or application behavior changes. Validate affected browser flows when UI behavior changes; report when that was skipped.

main is the default protected branch. Use pull requests. Merging to main triggers Cloud Run deployment; this audit authorizes neither merge nor deployment. Preserve Workload Identity Federation authentication and do not expose secrets.
