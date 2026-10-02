# OrangeHRM UI Test Automation

This repository contains browser-based acceptance and regression tests for the
OrangeHRM web application. It uses **Node.js 24**, **TypeScript**, **Playwright**
for browser control, and **Cucumber.js** for Gherkin scenarios. ESLint and
Prettier provide static analysis and formatting. Docker is available for
reproducible test runs.

The default target is the public OrangeHRM demo at
`https://opensource-demo.orangehrmlive.com`. It is a shared, mutable
environment: tests can create employees and reports that remain after a run.
Use a separately managed test instance for repeated or production-like runs.

## 1. Clone the repository

Install Git if needed from [git-scm.com](https://git-scm.com/downloads), then
run the following command in a terminal:

```bash
git clone https://github.com/DonikaBuz/orangehrm-test-automation.git
cd orangehrm-test-automation
```

If this repository is public, cloning it over HTTPS does not require a GitHub
account or token. If it is private, you need repository access and your own
GitHub authentication; never use a token provided by someone else.

## 2. Install the required tools

Install **Node.js 24.x** (npm is included) from the
[Node.js download page](https://nodejs.org/en/download). Docker is optional and
is only needed for the container workflow; install Docker Desktop from the
[Docker Desktop download page](https://www.docker.com/products/docker-desktop/).
Start Docker Desktop before running Docker commands.

## 3. Verify installations

Run these commands in a terminal to verify Git and Node.js/npm. Check Docker
only if you installed it for the container workflow:

```text
git --version
node --version
npm --version
```

The Node version should begin with `v24`. Docker is only needed for the
container workflow; verify it with `docker --version`.

## 4. Install project dependencies and browsers

From the repository directory, install the exact project dependencies recorded
in `package-lock.json`. This includes TypeScript, Cucumber.js, Playwright,
ESLint, and Prettier; there is no need to install them globally.

```bash
npm ci
```

For local browser runs, install Playwright's supported browsers:

```bash
npx playwright install chromium firefox webkit
```

On Linux outside Docker, install the browser system dependencies as well:

```bash
npx playwright install --with-deps chromium firefox webkit
```

## 5. Configure accounts and the target application

Create a file named `.env` in the repository's root directory. Use
[.env.example](./.env.example) as the template: copy its contents into `.env`,
then set `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and
`PIM_TEST_EMPLOYEE_PASSWORD` for the target OrangeHRM instance. The `.env` file
is required for running the tests.

See [.env.example](./.env.example) for the complete list of supported
environment variables and their defaults.

`ADMIN_USERNAME` and `ADMIN_PASSWORD` are required when a scenario logs in as
`administrator`. `PIM_TEST_EMPLOYEE_PASSWORD` is required by the scenario that
creates an employee with login credentials; use a value accepted by the
application's password policy. Do not commit `.env` or put credentials in
feature files. The repository ignores `.env` and the Docker build excludes it.
The container receives it only at run time.

Optional configuration includes `ACTION_TIMEOUT`, `NAVIGATION_TIMEOUT`,
`STEP_TIMEOUT`, `VIEWPORT_WIDTH`, and `VIEWPORT_HEIGHT`. Values for timeouts and
viewport dimensions must be positive integers. `BROWSER` can be `chromium`,
`firefox`, or `webkit`. `CUCUMBER_WORKERS` must be a positive integer; keep it
at `1` when testing against the shared demo.

## 6. Run tests locally

The standard command compiles TypeScript, prepares the report directory, and
runs all discovered Cucumber scenarios:

```bash
npm test
```

Useful commands:

| Command                                              | Purpose                                                               |
| ---------------------------------------------------- | --------------------------------------------------------------------- |
| `npm run test:sanity`                                | Run the sanity-tagged smoke coverage, excluding regression scenarios. |
| `npm run test:regression`                            | Run scenarios tagged `@regression`.                                   |
| `npm test -- --tags "@sanity"`                       | Select scenarios by a Cucumber tag.                                   |
| `npm test -- --name "Delete a PIM report I created"` | Select scenarios by matching their names.                             |
| `npm run test:dry-run`                               | Check that steps are defined without executing browser interactions.  |
| `npm run check`                                      | Run TypeScript type checking, ESLint, and Prettier checks.            |
| `npm run build`                                      | Compile `src/` TypeScript into `dist/`.                               |

The npm test command accepts Cucumber.js options after `--`, for example:

```bash
npm test -- --name "Create an employee and update personal, custom, and attachment details"
```

Run `npm run test:sanity` before regression coverage when checking a new
environment or credentials. The public demo can be slow or unavailable, so a
browser timeout is not always evidence of a code defect.

### Debug a scenario interactively

Set `PWDEBUG=1` to force a visible browser and pause after each completed
Cucumber step in the Playwright Inspector. Resume in the Inspector to continue
to the next step. Run one scenario at a time. This interactive mode is intended
for local runs, not Docker or CI.

macOS:

```bash
PWDEBUG=1 npm test -- --name "Create an employee and update personal, custom, and attachment details"
```

Windows PowerShell:

```powershell
$env:PWDEBUG = "1"
npm test -- --name "Create an employee and update personal, custom, and attachment details"
Remove-Item Env:PWDEBUG
```

## 7. Run tests in Docker

Docker provides Node.js, project dependencies, Playwright browsers, and Linux
browser dependencies in one image. First start Docker Desktop, then build the
image from the repository root:

```bash
docker build -t orangehrm-test-automation .
```

The default container command builds the project and runs the full Cucumber
suite. Mount `reports/` to keep generated reports and failure artifacts on the
host, and pass credentials from `.env` at run time.

### macOS (Terminal)

```bash
mkdir -p reports
docker run --rm --init --ipc=host \
  --env-file .env \
  -e HEADLESS=true \
  -v "$PWD/reports:/app/reports" \
  orangehrm-test-automation
```

### Windows (PowerShell)

```powershell
New-Item -ItemType Directory -Force reports | Out-Null
docker run --rm --init --ipc=host `
  --env-file .env `
  -e HEADLESS=true `
  -v "${PWD}/reports:/app/reports" `
  orangehrm-test-automation
```

To run a subset in Docker, pass Cucumber arguments after the image name:

```bash
docker run --rm --init --ipc=host --env-file .env \
  -e HEADLESS=true -v "$PWD/reports:/app/reports" \
  orangehrm-test-automation npm test -- --tags @sanity
```

In PowerShell, use backticks instead of the Bash line-continuation backslashes.
The container's exit status is the test command's exit status.

## 8. Suite structure and design

```text
features/                 Gherkin features and scenarios
src/
  config/                 Environment and account configuration
  pages/                  Playwright page objects and UI operations
  steps/                  Cucumber step definitions
  support/                World, sessions, browser startup and teardown
test-data/fixtures/        Small synthetic files used by tests
reports/                  Generated Cucumber reports and failure artifacts
```

Cucumber is the only test runner. Gherkin describes behavior; step definitions
coordinate scenario data and delegate browser work to page objects. The page
objects encapsulate OrangeHRM selectors and interactions. Each Cucumber World
owns its scenario-local data and session manager. Browser contexts are isolated
between scenarios, while Cucumber worker count defaults to one to reduce
collisions against shared server-side demo data.

Active coverage currently includes:

- `@sanity`: administrator login and dashboard verification.
- `@regression`: employee creation with login credentials; employee creation
  and update of Personal Details, Custom Fields, and an attachment; PIM report
  creation using Employment Status and displaying Personal → Employee First
  Name; create and delete a report created within that scenario; employee
  deletion.

The employee-ID search and required-name validation scenarios are deferred and
are not currently implemented in the active feature file. Report deletion is
covered by the active scenario that deletes a report created within that same
scenario. Check [pim.feature](./features/regression/pim.feature) for the
authoritative active scenario list and tags.

## 9. Test data and shared application behavior

- Employee names and report names include generated suffixes to reduce
  collisions. Each scenario creates the records it needs rather than relying on
  records created by another scenario.
- Employee creation supplies a random seven-digit Employee Id because the
  shared demo's default next ID has collided with an existing record.
- Employee deletion targets the employee ID returned by that scenario's
  creation flow. Generic teardown does not delete employees or reports.
- The standalone report-creation scenario leaves its report in the demo. The
  report create-and-delete scenario generates a unique name, verifies the exact
  full title, searches for that exact report, and deletes only the report it
  created.
- Failed runs can leave created data behind. Browser-context isolation does not
  isolate server-side records. Review the target environment before rerunning
  mutating scenarios.
- The supported employee details scenario saves and reloads the page before
  comparing Nationality, Marital Status, Blood Type, and other entered values.
  Date fields have been observed to use `yyyy-dd-mm` formatting in the demo.
- The demo's autocomplete options are asynchronous. A temporary “Searching...”
  entry can appear before actual suggestions, so the test waits for a real
  suggestion before selecting.
- UI behavior and availability can vary by OrangeHRM version and account
  permissions. SSN, SIN, Military Service, Smoker, and IT Officer are not
  covered; investigate their availability and any nationality-dependent
  behavior before adding steps.

See the [PIM test plan](./docs/PIM/TEST-PLAN.md) for additional scope, known
limitations, and verification notes.

## 10. Results and failure artifacts

Every run writes Cucumber reports under `reports/`:

- `reports/cucumber.html` — human-readable report.
- `reports/cucumber.json` — machine-readable Cucumber results.
- `reports/cucumber.xml` — JUnit XML results.
- `reports/artifacts/` — per-scenario screenshots, traces, videos, and bounded
  browser diagnostics for failures.

Run `npm test` first to generate or refresh the reports. Open the HTML report
from the repository root:

macOS (Terminal):

```bash
open reports/cucumber.html
```

Windows (PowerShell):

```powershell
Invoke-Item reports\cucumber.html
```

The Docker commands above mount this directory so output remains available
after the container exits. Successful scenarios discard their per-scenario
debug artifacts; failed scenarios retain evidence when capture succeeds.
Sensitive scenarios disable tracing and video because they enter a password.
Treat reports and artifacts as potentially sensitive.

## 11. Known instability and next steps

The public demo has shown intermittent behavior during automation. In recorded
runs, employee creation has sometimes appeared to complete without the expected
success toast, and navigation to Personal Details has sometimes timed out after
the save action. These failures are not yet classified as application
instability versus automation timing/locator defects. Inspect the retained
screenshot, trace, video, and diagnostics before retrying; a failed navigation
does not prove that the server did not create the employee.

If continuing work on this suite, prioritize:

1. Diagnose and stabilize the employee-creation success/navigation assertions,
   including the credentials-enabled path.
2. Verify that each failure artifact type is retained and useful in local and
   Docker runs.
3. Implement and verify employee-ID search and required-name validation
   scenarios before adding them to the active regression suite.
4. Confirm whether deleting an employee with login credentials also removes
   the linked application account.
5. Investigate currently unsupported and potentially nationality-dependent
   employee fields without making assumptions from codegen alone.
6. Run against a dedicated resettable OrangeHRM instance before increasing
   worker count or relying on repeated regression runs.

## AI assistance

AI tools were used as an aid during this project for README implementation, improvements, debugging guidance and refining test scenarios. I reviewed and validated the resulting changes, and remain responsible for the final implementation and test outcomes.
