# Convert HEIC To Any

A fast, private, in-browser HEIC image converter. Drag in the `.heic` photos from your iPhone and get back JPG, PNG, or WebP — no uploads, no servers, no accounts. Every conversion happens locally in your browser.

## Features

- **Drag & drop** batch conversion of `.heic` files
- **Multiple output formats** — JPEG, PNG, or WebP
- **Download individually or all at once** as a ZIP archive
- **Conversion history** persisted locally in your browser (IndexedDB), with one-click re-download
- **100% private** — files never leave your machine; all processing runs client-side

## Tech Stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/) for dev server and builds
- [Tailwind CSS 4](https://tailwindcss.com/) for styling
- [heic2any](https://github.com/alexcorvi/heic2any) for HEIC decoding/conversion
- [JSZip](https://stuk.github.io/jszip/) for batch ZIP downloads
- [idb-keyval](https://github.com/jakearchibald/idb-keyval) for IndexedDB history storage
- [Lucide](https://lucide.dev/) icons and [Motion](https://motion.dev/) animations

## Getting Started

**Prerequisites:** [Node.js](https://nodejs.org/) (v18 or later)

```bash
# Install dependencies
npm install

# Start the dev server (http://localhost:3000)
npm run dev
```

## Scripts

| Command           | Description                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Start the development server         |
| `npm run build`   | Build for production into `dist/`    |
| `npm run preview` | Preview the production build locally |
| `npm run lint`    | Type-check with TypeScript           |

## Deployment

The app is hosted on [Google Cloud Run](https://cloud.google.com/run) and deploys automatically:

1. Open a pull request against `main` (direct pushes are blocked by branch protection)
2. Once approved and merged, the [Deploy to Cloud Run](.github/workflows/deploy.yml) GitHub Actions workflow builds the [Dockerfile](Dockerfile) (Vite production build served by nginx) and deploys it to the `heic-converter` service in `us-west2`

GitHub authenticates to Google Cloud via [Workload Identity Federation](https://github.com/google-github-actions/auth#preferred-direct-workload-identity-federation) — no service-account keys are stored in the repo. The workflow uses two repository secrets:

| Secret             | Purpose                                          |
| ------------------ | ------------------------------------------------ |
| `GCP_WIF_PROVIDER` | Workload Identity Federation provider resource   |
| `GCP_DEPLOY_SA`    | Service account email the workflow impersonates  |

To deploy manually instead:

```bash
gcloud run deploy heic-converter --region us-west2 --source .
```

## How It Works

HEIC (High Efficiency Image Container) is the default photo format on iPhones, but it isn't widely supported on the web or Windows. This app uses [heic2any](https://github.com/alexcorvi/heic2any) — a WebAssembly-backed decoder — to convert HEIC files to standard formats entirely in the browser. Your photos are never uploaded anywhere.
