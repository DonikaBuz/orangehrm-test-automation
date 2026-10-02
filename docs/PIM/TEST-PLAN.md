# OrangeHRM UI Automation Test Plan

## Purpose

This plan describes the implemented challenge coverage and the additional
checks that would provide useful PIM regression coverage. The system under test
is the OrangeHRM demo at
`https://opensource-demo.orangehrmlive.com/web/index.php`. The running
application is the behavioral reference; confirm unclear rules in the UI
instead of assuming them.

The challenge implementation uses strict TypeScript on Node.js 24, Playwright
as a browser library, Cucumber.js as the test runner, and ESLint/Prettier.

## Objectives and scope

Prioritize reliable login and employee lifecycle checks on the PIM employee
list, with attention to employee identity, persisted changes, and safe
deletion. Keep the automated regression suite small, independent, and suitable
for a shared demo environment.

### Included

- Administrator login and dashboard verification.
- PIM employee creation, supported personal and custom details, attachment
  upload, and employee deletion.
- PIM report creation and deletion of a report created by that scenario.
- Additional manual PIM checks listed below, when the target environment and
  test data make them safe.

### Not included in this submission

Leave, attendance, recruitment, performance, expenses, administration, and
cross-module workflows are outside the requested login/PIM scope. Broad
accessibility, compatibility, security, and performance testing would require
separate objectives and, for some tests, an isolated authorized environment.

## Test approach

- Use Cucumber scenarios for repeatable UI workflows and keep browser
  interactions in page objects.
- Give each scenario its own browser context and create the records it needs;
  do not depend on records left by another scenario.
- Prefer exact identifiers and state/persistence assertions over relying only
  on success notifications.
- Run with one worker against the shared public demo. Avoid unnecessary
  retries: concurrent users and shared server-side data can affect outcomes.
- Treat behavior that is unclear or varies by demo version as an item to
  investigate, not as an assumed product rule.

## Implemented automated coverage

The following scenarios are active in
[`features/regression/pim.feature`](../../features/regression/pim.feature).
All are tagged `@regression`; the login-credentials scenario is also tagged
`@sensitive`.

| Scenario                                                                     | Main checks                                                                                                                                                                     |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create an employee with login credentials and verify saved details           | Employee creation, success notification, and saved employee details. The sensitive tag disables tracing and video for this scenario; failure screenshots may still be captured. |
| Create an employee and update personal, custom, and attachment details       | Supported profile values persist after saving; the synthetic attachment is listed.                                                                                              |
| Create a PIM report using employment status and display employee first names | Report creation using the selected employment status and Employee First Name display field; the exact generated report title is verified.                                       |
| Delete a PIM report I created                                                | The scenario creates a uniquely named report, finds that report, and deletes only its own report.                                                                               |
| Delete an employee I created                                                 | The scenario confirms and deletes the employee it created.                                                                                                                      |

The `@sanity` feature currently verifies administrator login and the dashboard.
Employee-ID search and required-name validation are not currently active
scenarios.

## Additional PIM regression checks

These are proposed manual checks, not active automated scenarios. Verify the
applicable behavior and use owned test records before attempting mutations.

| ID     | Check                                                                            | Expected result                                                                                             |
| ------ | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| MAN-01 | Submit the employee form with a required name missing.                           | Validation prevents saving; no employee is created.                                                         |
| MAN-02 | Try an Employee Id already assigned to another test-owned employee.              | The application handles the duplicate without changing the existing employee. Confirm the exact rule first. |
| MAN-03 | Check name boundaries, whitespace, apostrophes, and Unicode.                     | Inputs follow observed constraints and saved values are not corrupted.                                      |
| MAN-04 | Search for an owned employee by exact ID and name.                               | Both searches identify the same employee and do not match another record.                                   |
| MAN-05 | Combine supported employee and job/status/subunit filters.                       | Results match the selected criteria; conflicting criteria do not leave stale rows.                          |
| MAN-06 | Reset active filters and search again.                                           | Filters return to their confirmed defaults and the owned employee can be found.                             |
| MAN-07 | Sort supported columns and navigate available result pages.                      | Ordering and pagination follow the UI; do not assume a fixed global record count.                           |
| MAN-08 | Save valid contact details and try invalid email input.                          | Valid data persists and invalid data follows the confirmed validation behavior.                             |
| MAN-09 | Add, edit, and remove an owned emergency contact or dependent.                   | Only the selected entry is changed or removed.                                                              |
| MAN-10 | Update job title, status, or subunit using existing options.                     | Saved values persist and supported filters can find the employee.                                           |
| MAN-11 | Assign and remove a supervisor/subordinate relationship between owned employees. | The relationship is displayed correctly and only that relationship is changed.                              |
| MAN-12 | Try unsupported or oversized attachments and cancel an upload.                   | Confirmed file restrictions are enforced; a cancelled upload is not saved.                                  |
| MAN-13 | Cancel employee deletion.                                                        | The employee remains and other test-owned records are unaffected.                                           |
| MAN-14 | Check PIM and report access with dedicated ESS/supervisor accounts.              | Access follows configured roles; perform this only with authorized accounts in a suitable environment.      |

Employee-ID search and required-name validation are the highest-priority
deferred checks because they directly cover retrieval and form validation.
Pagination, role access, and broader relationship workflows may be blocked by
the limited or shared nature of the demo; do not create large datasets or
change global configuration to force them.

## Test data and shared-demo safeguards

- Supply credentials through a local `.env` file or runtime environment
  variables; never place credentials in feature files or commit them.
- Generate employee names and IDs and report names to reduce collisions.
  Employee creation uses a random seven-digit ID because the demo's default
  next ID has previously collided with an existing record.
- Use only the exact employee ID or report name created by the current
  scenario when verifying or deleting data. Never delete records based on a
  name prefix or a global selection.
- Browser-context isolation does not isolate server-side records. Failed runs
  can leave data behind. Generic teardown does not delete employees or
  reports: the employee-deletion scenario deletes its own employee, the
  create-and-delete report scenario deletes its own report, and the standalone
  report-creation scenario leaves its report in the demo.
- Review the target environment before rerunning mutating scenarios and
  account for persistent records. Use a dedicated resettable instance for
  repeated runs or tests requiring special accounts/configuration.
- The employee-details scenario uses supported Personal Details fields
  (including driver's license, expiry date, nationality, marital status, date
  of birth, and gender) and Custom Fields (including Blood Type and
  `Test_Field`). Other fields may be unavailable or nationality-dependent.

## Known behavior and risks

- The public demo is shared and can be slow, reset, or changed without notice.
  A timeout may indicate environment instability or an automation issue; use
  retained artifacts to investigate before rerunning.
- The demo's autocomplete suggestions are asynchronous. A temporary
  “Searching...” entry can appear before selectable suggestions.
- Date fields have displayed and persisted `yyyy-dd-mm` values in the observed
  demo, despite an apparent `yyyy-mm-dd` placeholder. Reconfirm if the demo's
  version or locale changes.
- Deleting an employee with login credentials may affect the linked account;
  this behavior has not been confirmed.
- Failure artifacts may contain application or session information. Treat
  them as sensitive and share only after review. The `@sensitive` scenario
  disables tracing and video, but does not disable failure screenshots.

## Execution and completion

Run `npm run test:sanity` first, then `npm run test:regression` or `npm test`.
The default worker count is one for the shared demo. Docker runs headless and
accepts credentials at runtime. Cucumber writes reports and failure artifacts
under `reports/`; see the README for setup, commands, and artifact details.

Report actual test results separately from planned/manual coverage. A passing
selected suite provides confidence only in the exercised workflows; it does
not establish full OrangeHRM coverage. Record blocked or unrun checks
explicitly and investigate residual test data before sharing the environment.
