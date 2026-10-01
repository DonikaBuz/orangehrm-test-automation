import { randomUUID } from "node:crypto";
import type { Locator, Page } from "playwright";

import { getPimTestEmployeePassword } from "../config/accounts.js";

export interface EmployeeProfile {
  firstName: string;
  middleName: string;
  lastName: string;
}

export interface EmployeeDetails extends EmployeeProfile {
  employeeId: string;
}

export interface EmployeeCreationResult {
  employee: EmployeeProfile;
  successNotificationVisible: boolean;
}

export class PimPage {
  constructor(private readonly page: Page) {}

  async openAddEmployee(): Promise<void> {
    await this.page.getByRole("link", { name: "PIM", exact: true }).click();
    await this.page
      .getByRole("heading", { name: "Employee Information", exact: true })
      .waitFor({ state: "visible" });
    await this.page
      .getByRole("link", { name: "Add Employee", exact: true })
      .click();
    await this.page.getByRole("textbox", { name: "First Name" }).waitFor();
  }

  async createEmployee(): Promise<EmployeeDetails> {
    await this.openAddEmployee();
    const details = this.newEmployeeProfile();
    await this.fillNameFields(details);
    const employeeId = (await this.employeeIdInput().inputValue()).trim();
    if (!employeeId) {
      throw new Error("OrangeHRM did not assign an employee ID.");
    }
    await this.page.getByRole("button", { name: "Save", exact: true }).click();
    await this.page.waitForURL(/\/pim\/viewPersonalDetails\/empNumber\/\d+/);
    return { ...details, employeeId };
  }

  async addEmployeeProfile(): Promise<EmployeeProfile> {
    const profile = this.newEmployeeProfile();
    await this.fillNameFields(profile);
    return profile;
  }

  async addEmployeeCredentialsAndSave(
    profile: EmployeeProfile,
  ): Promise<EmployeeCreationResult> {
    const createLoginDetailsSwitch = this.page.locator(".oxd-switch-input");
    await createLoginDetailsSwitch.click();

    const username = `Test_Automation_User_${randomUUID()
      .replaceAll("-", "")
      .slice(0, 8)}`;
    const password = getPimTestEmployeePassword();
    const usernameInput = this.page.getByRole("textbox").nth(5);
    await usernameInput.waitFor({ state: "visible" });
    await usernameInput.fill(username);

    const passwordInputs = this.page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill(password);
    await passwordInputs.nth(1).fill(password);
    await this.page
      .getByRole("radio", { name: "Enabled", exact: true })
      .check();

    const successNotification = this.successMessage("Successfully Saved")
      .waitFor({ state: "visible" })
      .then(
        () => true,
        () => false,
      );
    await this.page.getByRole("button", { name: "Save", exact: true }).click();
    return {
      employee: profile,
      successNotificationVisible: await successNotification,
    };
  }

  async displayedEmployeeDetails(): Promise<EmployeeDetails> {
    await this.page
      .getByRole("heading", { name: "Personal Details", exact: true })
      .waitFor({ state: "visible" });

    const [firstName, middleName, lastName, employeeId] = await Promise.all([
      this.page.getByRole("textbox", { name: "First Name" }).inputValue(),
      this.page.getByRole("textbox", { name: "Middle Name" }).inputValue(),
      this.page.getByRole("textbox", { name: "Last Name" }).inputValue(),
      this.employeeIdInput().inputValue(),
    ]);
    return {
      firstName,
      middleName,
      lastName,
      employeeId: employeeId.trim(),
    };
  }

  async searchByEmployeeId(employeeId: string): Promise<Locator> {
    await this.page.goto("/web/index.php/pim/viewEmployeeList");
    await this.employeeIdInput().fill(employeeId);
    await this.page.getByRole("button", { name: "Search" }).click();

    return this.page
      .locator(".oxd-table-row")
      .filter({ has: this.page.getByText(employeeId, { exact: true }) })
      .first();
  }

  async employeeAppearsInSearch(employeeId: string): Promise<boolean> {
    const row = await this.searchByEmployeeId(employeeId);
    await row.waitFor({ state: "visible" });
    return row.isVisible();
  }

  async updateNationality(employee: EmployeeDetails): Promise<string> {
    const row = await this.searchByEmployeeId(employee.employeeId);
    await row
      .locator(".oxd-table-cell")
      .filter({ hasText: employee.firstName })
      .first()
      .click();
    await this.page.waitForURL(/\/pim\/viewPersonalDetails\/empNumber\/\d+/);
    await this.waitForEmployeeName(employee.firstName);

    const nationality = await this.selectNonPlaceholderOption("Nationality");
    await this.page
      .getByRole("button", { name: "Save", exact: true })
      .first()
      .click();
    await this.successMessage("Successfully Updated").waitFor({
      state: "visible",
    });
    return nationality;
  }

  async currentNationality(): Promise<string> {
    return this.fieldGroup("Nationality")
      .locator(".oxd-select-text")
      .innerText();
  }

  async openDeleteConfirmation(employeeId: string): Promise<void> {
    const row = await this.searchByEmployeeId(employeeId);
    await row.getByRole("button").last().click();
    await this.page.getByText("Are you Sure?", { exact: false }).waitFor({
      state: "visible",
    });
  }

  async confirmDelete(): Promise<void> {
    await this.page.getByRole("button", { name: /Yes, Delete/ }).click();
    await this.successMessage("Successfully Deleted").waitFor({
      state: "visible",
    });
  }

  async deleteConfirmationVisible(): Promise<boolean> {
    return this.page.getByText("Are you Sure?", { exact: false }).isVisible();
  }

  async deleteSuccessVisible(): Promise<boolean> {
    return this.successMessage("Successfully Deleted").isVisible();
  }

  async employeeExists(employeeId: string): Promise<boolean> {
    const row = await this.searchByEmployeeId(employeeId);
    return this.waitForSearchResult(row);
  }

  private async waitForSearchResult(row: Locator): Promise<boolean> {
    const noRecords = this.page
      .locator(".oxd-table-body")
      .getByText("No Records Found", { exact: true });
    await Promise.race([
      row.waitFor({ state: "visible" }),
      noRecords.waitFor({ state: "visible" }),
    ]);
    return row.isVisible();
  }

  private async searchByEmployeeName(
    firstName: string,
    lastName: string,
  ): Promise<Locator> {
    await this.page.goto("/web/index.php/pim/viewEmployeeList");
    const employeeNameInput = this.fieldGroup("Employee Name").locator("input");
    await employeeNameInput.fill(firstName);

    const suggestion = this.page
      .locator(".oxd-autocomplete-option")
      .filter({ hasText: firstName })
      .filter({ hasText: lastName })
      .first();
    await suggestion.waitFor({ state: "visible" });
    await suggestion.click();
    await this.page.getByRole("button", { name: "Search" }).click();

    return this.page
      .locator(".oxd-table-row")
      .filter({ has: this.page.getByText(firstName, { exact: true }) })
      .filter({ has: this.page.getByText(lastName, { exact: true }) })
      .first();
  }

  async submitEmptyEmployeeForm(): Promise<void> {
    await this.openAddEmployee();
    await this.page.getByRole("button", { name: "Save", exact: true }).click();
  }

  async requiredNameErrorsVisible(): Promise<boolean> {
    const requiredErrors = this.page
      .locator(".oxd-input-field-error-message")
      .filter({ hasText: /^Required$/ });
    await requiredErrors.nth(1).waitFor({ state: "visible" });
    return (await requiredErrors.count()) >= 2;
  }

  async deleteEmployeeIfPresent(employeeId: string): Promise<void> {
    const row = await this.searchByEmployeeId(employeeId);
    if (!(await this.waitForSearchResult(row))) return;

    await this.deleteRow(row);
  }

  async deleteEmployeeByNameIfPresent(
    firstName: string,
    lastName: string,
  ): Promise<void> {
    const row = await this.searchByEmployeeName(firstName, lastName);
    if (!(await this.waitForSearchResult(row))) return;

    await this.deleteRow(row);
  }

  private async deleteRow(row: Locator): Promise<void> {
    await row.getByRole("button").last().click();
    await this.page.getByRole("button", { name: /Yes, Delete/ }).click();
    await this.successMessage("Successfully Deleted").waitFor({
      state: "visible",
    });
  }

  private newEmployeeProfile(): EmployeeProfile {
    const suffix = randomUUID().replaceAll("-", "").slice(0, 10);
    return {
      firstName: `Auto${suffix.slice(0, 5)}`,
      middleName: "Test",
      lastName: `User${suffix.slice(5)}`,
    };
  }

  private async waitForEmployeeName(firstName: string): Promise<void> {
    await this.page.waitForFunction((expectedName) => {
      const groups = Array.from(
        document.querySelectorAll<HTMLElement>(".oxd-input-group"),
      );
      const firstNameGroup = groups.find(
        (group) =>
          group.querySelector("label")?.textContent?.trim() === "First Name",
      );
      return firstNameGroup?.querySelector("input")?.value === expectedName;
    }, firstName);
  }

  private async fillNameFields(details: EmployeeProfile): Promise<void> {
    await this.page
      .getByRole("textbox", { name: "First Name" })
      .fill(details.firstName);
    await this.page
      .getByRole("textbox", { name: "Middle Name" })
      .fill(details.middleName);
    await this.page
      .getByRole("textbox", { name: "Last Name" })
      .fill(details.lastName);
  }

  private async selectNonPlaceholderOption(label: string): Promise<string> {
    const select = this.fieldGroup(label).locator(".oxd-select-text");
    await select.click();
    const options = this.page.locator(".oxd-select-option").filter({
      hasNotText: /^-- Select --$/,
    });
    await options.first().waitFor({ state: "visible" });

    const optionNames = (await options.allInnerTexts())
      .map((name) => name.trim())
      .filter((name) => name && name !== "-- Select --");
    if (optionNames.length === 0) {
      throw new Error(`No selectable options were available for ${label}.`);
    }

    const selected =
      optionNames[Math.floor(Math.random() * optionNames.length)];
    if (!selected) {
      throw new Error(`Could not select an option for ${label}.`);
    }
    await this.page.getByText(selected, { exact: true }).last().click();
    return selected;
  }

  private employeeIdInput(): Locator {
    return this.fieldGroup("Employee Id").locator("input");
  }

  private fieldGroup(label: string): Locator {
    return this.page
      .locator(".oxd-input-group")
      .filter({ has: this.page.getByText(label, { exact: true }) })
      .first();
  }

  private successMessage(message: string): Locator {
    return this.page.locator(".oxd-toast-content-text", { hasText: message });
  }
}
