# OrangeHRM UI Automation Test Plan

## Purpose and constraints

This suite checks a small, high-value slice of OrangeHRM through its browser UI.
The target is a shared public demo, so scenarios must not depend on pre-existing
employee data or change records they did not create. The application is the
specification: selectors and expected behavior must be confirmed against the
running instance before treating a scenario as verified.

The assignment fixes the stack: strict TypeScript on Node.js 24, Playwright as a
browser library, Cucumber.js as the sole runner, and ESLint/Prettier. The suite
uses Cucumber tags to keep quick health checks separate from PIM regression
coverage.

## Initial coverage

### Sanity (`@sanity`)

- Log in as the configured administrator and verify the dashboard.

### PIM regression (`@regression`)

- Create an employee, save the Employee Id returned by the application, search
  for that exact ID, and verify a result.
- Create an employee with generated login details. This is tagged `@sensitive`;
  tracing and video are disabled for the scenario.
- Create an employee, select a non-placeholder Nationality option, save, and
  update the supported Personal Details fields and Custom Fields, saving and
  verifying each section after reload. Upload a small synthetic attachment
  fixture and verify that it is listed on the employee.
- Create a uniquely named PIM report using the `Employment Status` criterion
  with `Full-Time Permanent`, and display the `Personal → Employee First Name`
  field.
  Verify the success notification and the exact full report title, including
  its generated suffix.
- Create another uniquely named report within the scenario, search for its
  exact generated name, and delete only that scenario-owned report. Verify the
  creation/deletion notifications and that it no longer appears in results.
- Create an employee, inspect the delete confirmation, delete that employee,
  and verify the success notification and absence from search.
- Submit the employee form without required names and verify validation.

Each scenario that needs an employee creates its own. The scenarios do not
depend on execution order or on records made by another scenario. Teardown
does not automatically delete created employees: deletion is covered explicitly
by the delete scenario, and other scenario-created records remain in the demo.

## Deliberate non-coverage

OrangeHRM includes many modules, but this submission focuses on login and the
requested PIM subpage. Leave, attendance, recruitment, performance, expenses,
system administration, permissions, and cross-module workflows are not covered:
they are outside the selected scope and would require additional expected
behavior, accounts, and safe test-data strategies.

The create/search flow, supported personal/custom-field edits, and attachment
upload have been exercised against the running demo. Generic teardown closes
browser resources but intentionally leaves created employee records in place.
The delete scenario is the only workflow that explicitly deletes an employee.
Whether deleting an employee with login details also removes the linked
application account has not been confirmed.

The current scenario covers Driver's License Number, License Expiry Date,
Nationality, Marital Status, Date of Birth, and Gender in Personal Details, and
Blood Type plus `Test_Field` in Custom Fields. SSN, SIN, Military Service,
Smoker, and IT Officer are not currently covered; confirm whether their
availability depends on nationality before adding them.
The date fields display and persist values in `yyyy-dd-mm` order on the current
demo, despite codegen showing an apparent `yyyy-mm-dd` placeholder; keep this
behavior in mind if the demo version or locale changes.

## Test data and shared-demo safety

- Credentials are supplied through local ignored `.env` or runtime environment
  variables; they are not stored in feature files.
- Employee names are generated per scenario to reduce collisions under
  parallel execution.
- Employee creation fills a random seven-digit Employee Id rather than relying
  on the shared demo's next default ID, which has collided with existing
  records.
- Assertions use the employee ID returned by that scenario's create operation.
- The delete scenario deletes only the employee it created and identified by
  its returned employee ID. Generic teardown does not delete employee records.
- The public demo is shared. Keep execution considerate, avoid unnecessary
  reruns, and do not treat browser isolation as server-data isolation.
- Because generic teardown does not delete test data, run against an environment
  where persistent test employees are acceptable and account for them when
  assessing repeated runs.

## Execution and evidence

Run `npm run test:sanity`, `npm run test:regression`, or `npm test`. The sanity
command excludes regression-tagged scenarios and is intended as a login-only
smoke run. The default Cucumber worker count is one for the shared demo and can
be overridden with a positive `CUCUMBER_WORKERS` value. The Docker image runs headless and accepts credentials
at runtime.

Cucumber writes HTML, JSON, and JUnit reports under `reports/` for every run.
Failed scenarios retain screenshots, traces where enabled, videos where
enabled, and browser diagnostics there; successful scenarios remove their
per-scenario artifact directory. These artifacts can contain sensitive
application/session information and should be handled accordingly.

## Verification status and risks

Static checks (TypeScript, ESLint, and Prettier) validate source consistency,
not live UI behavior. Before presenting the suite as operational:

1. Confirm the live instance is available and the administrator credentials are
   valid.
2. Run the sanity scenario first.
3. Run the remaining regression scenarios and confirm the explicit delete
   scenario removes its employee; other created records are intentionally left
   in place.
4. Confirm debugging artifacts are retained on failure and successful scenarios
   remove their per-scenario artifact directories. Confirm reports remain
   available from Docker's mounted `reports/` directory.
5. Treat any UI selector or observed behavior discrepancy as a test/code issue
   to investigate, rather than assuming the public demo matches documentation.
