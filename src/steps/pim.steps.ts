import { strict as assert } from "node:assert";
import { Given, Then, When } from "@cucumber/cucumber";

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
  this.ownedEmployees.push({
    accountName: this.selectedAccount,
    firstName: profile.firstName,
    lastName: profile.lastName,
  });
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
  const employee = await session.pimPage.createEmployee();
  this.employeeUnderTest = employee;
  this.ownedEmployees.push({
    accountName: this.selectedAccount,
    employeeId: employee.employeeId,
    firstName: employee.firstName,
    lastName: employee.lastName,
  });
  this.log(
    `Actor=${this.selectedAccount} action=create employeeId=${employee.employeeId}`,
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
  "the new employee's personal details should be displayed",
  async function (this: OrangeHrmWorld) {
    const expected = requireEmployeeProfile(this);
    const actual = await this.sessionManager
      .authenticatedSession()
      .pimPage.displayedEmployeeDetails();

    assert.equal(actual.firstName, expected.firstName);
    assert.equal(actual.middleName, expected.middleName);
    assert.equal(actual.lastName, expected.lastName);
    assert.ok(
      actual.employeeId,
      "The new employee should have an assigned ID.",
    );
  },
);

When(
  "I update the employee's nationality",
  async function (this: OrangeHrmWorld) {
    const employee = requireEmployee(this);
    const session = this.sessionManager.authenticatedSession();
    this.scenarioData.nationality =
      await session.pimPage.updateNationality(employee);
  },
);

Then(
  "the selected nationality should be saved",
  async function (this: OrangeHrmWorld) {
    const expectedNationality = this.scenarioData.nationality;
    assert.equal(typeof expectedNationality, "string");
    const actualNationality = await this.sessionManager
      .authenticatedSession()
      .pimPage.currentNationality();
    assert.equal(actualNationality, expectedNationality);
  },
);

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
