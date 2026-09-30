# OrangeHRM UI Automation

This project automates the OrangeHRM demo application using Playwright as a library and Cucumber.js as the sole runner.

## Runtime foundation

- TypeScript compiles the implementation in `src/` into `dist/`.
- Cucumber loads the compiled support and step files from `dist/` using `cucumber.cjs`.
- Playwright is used directly from `playwright` and is owned by the worker browser, while browser contexts and pages are scoped to each scenario.
- The support layer keeps session state isolated per scenario and allows switching named accounts without sharing cookies.

## Named account usage

- The default account is configured in `src/config/accounts.ts` under `administrator`.
- Credentials are read from environment variables for local development and container runtime.
- `.env` files are intentionally ignored and should never contain committed credentials or saved auth state.

## Local development

1. Copy `.env.example` to `.env` and update the values if needed.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the sanity suite:
   ```bash
   npm run test:sanity
   ```
4. Run a dry run to verify step matching:
   ```bash
   npm run test:dry-run
   ```

## Docker

```bash
docker build -t orangehrm-ui .
docker run --rm --init --ipc=host -e BROWSER=chromium -e HEADLESS=true -e CUCUMBER_WORKERS=2 -v "$PWD/reports:/app/reports" orangehrm-ui
```

## Artifacts

Failure screenshots and traces are saved under `reports/artifacts/<scenario-id>/`.

## AI disclosure

This repository can be used with AI-assisted generation and review. The implementation is intended to remain explicit, reviewable, and environment-driven rather than relying on hidden runtime state.
