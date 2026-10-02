import { strict as assert } from "node:assert";
import { Given, Then, When } from "@cucumber/cucumber";
import path from "node:path";

import type { EmployeeDetails, EmployeeProfile } from "../pages/PimPage.js";
import type { OrangeHrmWorld } from "../support/world.js";

Given("I am on the Add Employee page", async function (this: OrangeHrmWorld) {
  await this.sessionManager.authenticatedSession().pimPage.openAddEmployee();
});

When("I add an employee profile", async function (this: OrangeHrmWorld) {
  this.employeeProfileUnderTest = await this.sessionManager
    .authenticatedSession()
    .pimPage.addEmployeeProfile();
});

When("I add the employee credentials", async function (this: OrangeHrmWorld) {
  const profile = requireEmployeeProfile(this);
  const creation = await this.sessionManager
    .authenticatedSession()
    .pimPage.addEmployeeCredentialsAndSave(profile);
  this.scenarioData.successNotificationVisible =
    creation.successNotificationVisible;
  this.log(
    `Actor=${this.selectedAccount} action=create-employee-with-login-details firstName=${creation.employee.firstName}`,
  );
});

When("I create an employee", async function (this: OrangeHrmWorld) {
  const session = this.sessionManager.authenticatedSession();
  const creation = await session.pimPage.createEmployee();
  this.employeeUnderTest = creation.employee;
  this.employeeCreationNotificationVisible =
    creation.successNotificationVisible;
  this.log(
    `Actor=${this.selectedAccount} action=create employeeId=${creation.employee.employeeId}`,
  );
});

When(
  "I search for the employee using their assigned employee ID",
  async function (this: OrangeHrmWorld) {
    const employee = requireEmployee(this);
    const session = this.sessionManager.authenticatedSession();
    this.scenarioData.employeeFound =
      await session.pimPage.employeeAppearsInSearch(employee.employeeId);
    this.log(
      `Actor=${this.selectedAccount} action=search employeeId=${employee.employeeId}`,
    );
  },
);

Then(
  "the employee should be listed in the search results",
  function (this: OrangeHrmWorld) {
    assert.equal(this.scenarioData.employeeFound, true);
  },
);

Then(
  "the success notification should be shown",
  function (this: OrangeHrmWorld) {
    assert.equal(this.scenarioData.successNotificationVisible, true);
  },
);

Then(
  "the saved employee details should match the profile",
  async function (this: OrangeHrmWorld) {
    const expected = requireEmployeeProfile(this);
    const actual = await this.sessionManager
      .authenticatedSession()
      .pimPage.displayedEmployeeDetails(expected.firstName);

    assert.equal(
      actual.firstName,
      expected.firstName,
      "The saved first name should match the employee profile.",
    );
    assert.equal(
      actual.middleName,
      expected.middleName,
      "The saved middle name should match the employee profile.",
    );
    assert.equal(
      actual.lastName,
      expected.lastName,
      "The saved last name should match the employee profile.",
    );
    assert.ok(
      actual.employeeId,
      "The saved employee should have an assigned employee ID.",
    );
  },
);

Then(
  "the employee creation should be confirmed",
  function (this: OrangeHrmWorld) {
    const employee = requireEmployee(this);
    assert.equal(
      this.employeeCreationNotificationVisible,
      true,
      "The employee creation success notification should be shown.",
    );
    assert.ok(employee.employeeId, "The employee should have an assigned ID.");
  },
);

When(
  "I update the employee's personal details",
  async function (this: OrangeHrmWorld) {
    this.personalDetailsUnderTest = await this.sessionManager
      .authenticatedSession()
      .pimPage.updatePersonalDetails(requireEmployee(this));
  },
);

Then("the personal details should be saved", function (this: OrangeHrmWorld) {
  const result = this.personalDetailsUnderTest;
  assert.ok(result, "Update the employee's personal details first.");
  assert.equal(
    result.successNotificationVisible,
    true,
    "The personal details success notification should be shown.",
  );
  assert.deepEqual(
    result.actual,
    result.expected,
    "The saved personal details should match the values entered.",
  );
});

When(
  "I update the employee's custom fields",
  async function (this: OrangeHrmWorld) {
    this.customFieldsUnderTest = await this.sessionManager
      .authenticatedSession()
      .pimPage.updateCustomFields(requireEmployee(this));
  },
);

Then("the custom fields should be saved", function (this: OrangeHrmWorld) {
  const result = this.customFieldsUnderTest;
  assert.ok(result, "Update the employee's custom fields first.");
  assert.equal(
    result.successNotificationVisible,
    true,
    "The custom-fields success notification should be shown.",
  );
  assert.deepEqual(
    result.actual,
    result.expected,
    "The saved custom fields should match the values entered.",
  );
});

When(
  "I attach an image to the employee",
  async function (this: OrangeHrmWorld) {
    const attachmentPath = path.resolve(
      process.cwd(),
      "test-data/fixtures/employee-attachment.png",
    );
    this.employeeAttachmentUnderTest = await this.sessionManager
      .authenticatedSession()
      .pimPage.addEmployeeAttachment(requireEmployee(this), attachmentPath);
  },
);

When(
  "I create the PIM report {string}",
  async function (this: OrangeHrmWorld, reportName: string) {
    this.pimReportUnderTest = await this.sessionManager
      .authenticatedSession()
      .pimReportsPage.createReportUsingEmploymentStatus(reportName);
  },
);

When(
  "I create and delete a PIM report named {string}",
  async function (this: OrangeHrmWorld, reportNamePrefix: string) {
    this.pimReportCreateDeleteUnderTest = await this.sessionManager
      .authenticatedSession()
      .pimReportsPage.createAndDeleteReport(reportNamePrefix);
  },
);

Then(
  "the report should be saved successfully",
  function (this: OrangeHrmWorld) {
    assert.ok(this.pimReportUnderTest, "Create the PIM report first.");
    assert.equal(
      this.pimReportUnderTest.successNotificationVisible,
      true,
      "The report-save success notification should be shown.",
    );
  },
);

Then(
  "my PIM report should be created and deleted successfully",
  function (this: OrangeHrmWorld) {
    const result = this.pimReportCreateDeleteUnderTest;
    assert.ok(result, "Create and delete the PIM report first.");
    assert.equal(
      result.creationNotificationVisible,
      true,
      `The success notification for creating "${result.reportName}" should be shown.`,
    );
    assert.equal(
      result.reportNameDisplayed,
      true,
      `The full created report name "${result.reportName}" should be displayed.`,
    );
    assert.equal(
      result.deletionNotificationVisible,
      true,
      `The success notification for deleting "${result.reportName}" should be shown.`,
    );
    assert.equal(
      result.reportRemoved,
      true,
      `The created report "${result.reportName}" should no longer be listed.`,
    );
  },
);

Then("the report name should be displayed", function (this: OrangeHrmWorld) {
  assert.ok(this.pimReportUnderTest, "Create the PIM report first.");
  assert.equal(
    this.pimReportUnderTest.displayedReportName,
    this.pimReportUnderTest.reportName,
    "The displayed report title should exactly match the full saved report name.",
  );
});

Then("the attachment should be saved", async function (this: OrangeHrmWorld) {
  const attachment = this.employeeAttachmentUnderTest;
  assert.ok(attachment, "Attach the employee file first.");
  assert.equal(
    attachment.successNotificationVisible,
    true,
    "The attachment success notification should be shown.",
  );
  assert.equal(
    await this.sessionManager
      .authenticatedSession()
      .pimPage.employeeAttachmentIsVisible(attachment.fileName),
    true,
    "The uploaded attachment should be listed for the employee.",
  );
});

When(
  "I open the delete confirmation for my employee",
  async function (this: OrangeHrmWorld) {
    const employee = requireEmployee(this);
    await this.sessionManager
      .authenticatedSession()
      .pimPage.openDeleteConfirmation(employee.employeeId);
  },
);

Then(
  "the delete confirmation should be shown",
  async function (this: OrangeHrmWorld) {
    assert.equal(
      await this.sessionManager
        .authenticatedSession()
        .pimPage.deleteConfirmationVisible(),
      true,
    );
  },
);

When("I confirm deleting my employee", async function (this: OrangeHrmWorld) {
  await this.sessionManager.authenticatedSession().pimPage.confirmDelete();
});

Then(
  "the employee should be deleted successfully",
  async function (this: OrangeHrmWorld) {
    const employee = requireEmployee(this);
    const session = this.sessionManager.authenticatedSession();
    assert.equal(await session.pimPage.deleteSuccessVisible(), true);
    assert.equal(
      await session.pimPage.employeeExists(employee.employeeId),
      false,
    );
  },
);

When(
  "I submit the employee form without names",
  async function (this: OrangeHrmWorld) {
    await this.sessionManager
      .authenticatedSession()
      .pimPage.submitEmptyEmployeeForm();
  },
);

Then(
  "required name validation should be shown",
  async function (this: OrangeHrmWorld) {
    assert.equal(
      await this.sessionManager
        .authenticatedSession()
        .pimPage.requiredNameErrorsVisible(),
      true,
    );
  },
);

function requireEmployee(world: OrangeHrmWorld): EmployeeDetails {
  assert.ok(
    world.employeeUnderTest,
    "Create the employee in this scenario before using it.",
  );
  return world.employeeUnderTest;
}

function requireEmployeeProfile(world: OrangeHrmWorld): EmployeeProfile {
  assert.ok(
    world.employeeProfileUnderTest,
    "Add the employee profile in this scenario before adding credentials.",
  );
  return world.employeeProfileUnderTest;
}
