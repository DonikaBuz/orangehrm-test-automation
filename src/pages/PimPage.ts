import { randomInt, randomUUID } from "node:crypto";
import path from "node:path";
import { errors as playwrightErrors } from "playwright";
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
  employee: EmployeeDetails;
  successNotificationVisible: boolean;
}

export interface EmployeeCredentialsCreationResult {
  employee: EmployeeProfile;
  successNotificationVisible: boolean;
}

export interface EmployeePersonalDetails {
  driverLicenseNumber: string;
  licenseExpiryDate: string;
  nationality: string;
  maritalStatus: string;
  dateOfBirth: string;
  gender: string;
}

export interface EmployeeCustomFields {
  bloodType: string;
  testField: string;
}

export interface SavedSection<T> {
  expected: T;
  actual: T;
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

  async createEmployee(): Promise<EmployeeCreationResult> {
    await this.openAddEmployee();
    const profile = this.newEmployeeProfile();
    await this.fillNameFields(profile);
    await this.fillUniqueEmployeeId();
    const successNotification =
      this.waitForSuccessNotification("Successfully Saved");
    await this.page.getByRole("button", { name: "Save", exact: true }).click();
    await this.page.waitForURL(/\/pim\/viewPersonalDetails\/empNumber\/\d+/);
    await this.waitForEmployeeName(profile.firstName);
    return {
      employee: await this.displayedEmployeeDetails(),
      successNotificationVisible: await successNotification,
    };
  }

  async addEmployeeProfile(): Promise<EmployeeProfile> {
    const profile = this.newEmployeeProfile();
    await this.fillNameFields(profile);
    await this.fillUniqueEmployeeId();
    return profile;
  }

  async addEmployeeCredentialsAndSave(
    profile: EmployeeProfile,
  ): Promise<EmployeeCredentialsCreationResult> {
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

    const successNotification =
      this.waitForSuccessNotification("Successfully Saved");
    await this.page.getByRole("button", { name: "Save", exact: true }).click();
    return {
      employee: profile,
      successNotificationVisible: await successNotification,
    };
  }

  async displayedEmployeeDetails(
    expectedFirstName?: string,
  ): Promise<EmployeeDetails> {
    await this.page
      .getByRole("heading", { name: "Personal Details", exact: true })
      .waitFor({ state: "visible" });
    if (expectedFirstName) {
      await this.waitForEmployeeName(expectedFirstName);
    }

    const nameInputs = this.employeeFullNameGroup().locator("input");
    const [firstName, middleName, lastName, employeeId] = await Promise.all([
      nameInputs.nth(0).inputValue(),
      nameInputs.nth(1).inputValue(),
      nameInputs.nth(2).inputValue(),
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

  async updatePersonalDetails(
    employee: EmployeeDetails,
  ): Promise<SavedSection<EmployeePersonalDetails>> {
    const suffix = randomUUID().replaceAll("-", "").slice(0, 8);
    const expected: EmployeePersonalDetails = {
      driverLicenseNumber: `DL${suffix}`,
      licenseExpiryDate: "2035-31-12",
      nationality: await this.selectNonPlaceholderOption("Nationality"),
      maritalStatus: await this.selectNonPlaceholderOption("Marital Status"),
      dateOfBirth: "1992-22-04",
      gender: "Female",
    };

    const driverLicenseInput = this.fieldGroup(
      "Driver's License Number",
    ).locator("input");
    await driverLicenseInput.fill(expected.driverLicenseNumber);
    const licenseExpiryInput = this.page
      .getByRole("textbox", { name: "yyyy-dd-mm" })
      .first();
    await licenseExpiryInput.fill(expected.licenseExpiryDate);
    await this.fieldGroup("Date of Birth")
      .locator("input")
      .fill(expected.dateOfBirth);
    const genderGroup = this.fieldGroup("Gender");
    await genderGroup.getByText(expected.gender, { exact: true }).click();
    const genderRadio = genderGroup.getByRole("radio", {
      name: expected.gender,
      exact: true,
    });
    if (!(await genderRadio.isChecked())) {
      throw new Error(`Could not select ${expected.gender} gender.`);
    }
    const [driverLicenseValue, licenseExpiryValue, dateOfBirthValue] =
      await Promise.all([
        driverLicenseInput.inputValue(),
        licenseExpiryInput.inputValue(),
        this.fieldGroup("Date of Birth").locator("input").inputValue(),
      ]);
    if (driverLicenseValue !== expected.driverLicenseNumber) {
      throw new Error("The driver's license number was not entered.");
    }
    if (licenseExpiryValue !== expected.licenseExpiryDate) {
      throw new Error("The license expiry date was not entered.");
    }
    if (dateOfBirthValue !== expected.dateOfBirth) {
      throw new Error("The date of birth was not entered.");
    }
    const successNotification = this.waitForSuccessNotification(
      "Successfully Updated",
    );
    await this.personalDetailsForm()
      .getByRole("button", { name: "Save", exact: true })
      .click();
    const successNotificationVisible = await successNotification;

    await this.reloadEmployeeDetails(employee);
    return {
      expected,
      actual: await this.readPersonalDetails(),
      successNotificationVisible,
    };
  }

  async updateCustomFields(
    employee: EmployeeDetails,
  ): Promise<SavedSection<EmployeeCustomFields>> {
    const expected: EmployeeCustomFields = {
      bloodType: await this.selectNonPlaceholderOption("Blood Type"),
      testField: `Automation-${randomUUID().slice(0, 8)}`,
    };
    await this.fieldGroup("Test_Field")
      .locator("input")
      .fill(expected.testField);

    const successNotification =
      this.waitForSuccessNotification("Successfully Saved");
    await this.customFieldsForm()
      .getByRole("button", { name: "Save", exact: true })
      .click();
    const successNotificationVisible = await successNotification;

    await this.reloadEmployeeDetails(employee);
    return {
      expected,
      actual: await this.readCustomFields(),
      successNotificationVisible,
    };
  }

  async addEmployeeAttachment(
    employee: EmployeeDetails,
    filePath: string,
  ): Promise<{ fileName: string; successNotificationVisible: boolean }> {
    const fileName = path.basename(filePath);
    const attachmentSection = this.page.locator(".orangehrm-attachment");
    await attachmentSection.getByRole("button", { name: /Add/ }).click();

    await attachmentSection
      .locator('input[type="file"]')
      .setInputFiles(filePath);
    await attachmentSection
      .getByRole("textbox", { name: "Type comment here" })
      .fill("Automated PIM attachment");

    const successNotification =
      this.waitForSuccessNotification("Successfully Saved");
    await attachmentSection
      .getByRole("button", { name: "Save", exact: true })
      .click();
    const successNotificationVisible = await successNotification;

    await this.reloadEmployeeDetails(employee);
    await this.page
      .locator(".orangehrm-attachment")
      .getByText(fileName, { exact: true })
      .waitFor({ state: "visible" });
    return { fileName, successNotificationVisible };
  }

  async employeeAttachmentIsVisible(fileName: string): Promise<boolean> {
    return this.page
      .locator(".orangehrm-attachment")
      .getByText(fileName, { exact: true })
      .isVisible();
  }

  private async readPersonalDetails(): Promise<EmployeePersonalDetails> {
    return {
      driverLicenseNumber: await this.fieldGroup("Driver's License Number")
        .locator("input")
        .inputValue(),
      licenseExpiryDate: await this.fieldGroup("License Expiry Date")
        .locator("input")
        .inputValue(),
      nationality: (
        await this.fieldGroup("Nationality")
          .locator(".oxd-select-text")
          .innerText()
      ).trim(),
      maritalStatus: (
        await this.fieldGroup("Marital Status")
          .locator(".oxd-select-text")
          .innerText()
      ).trim(),
      dateOfBirth: await this.fieldGroup("Date of Birth")
        .locator("input")
        .inputValue(),
      gender: await this.page
        .getByRole("radio", { name: "Female", exact: true })
        .isChecked()
        .then((checked) => (checked ? "Female" : "Male")),
    };
  }

  private async readCustomFields(): Promise<EmployeeCustomFields> {
    const [bloodType, testField] = await Promise.all([
      this.fieldGroup("Blood Type").locator(".oxd-select-text").innerText(),
      this.fieldGroup("Test_Field").locator("input").inputValue(),
    ]);
    return {
      bloodType: bloodType.trim(),
      testField,
    };
  }

  private async reloadEmployeeDetails(
    employee: EmployeeDetails,
  ): Promise<void> {
    await this.page.reload();
    await this.page
      .getByRole("heading", { name: "Personal Details", exact: true })
      .waitFor({ state: "visible" });
    await this.waitForEmployeeName(employee.firstName);
  }

  private personalDetailsForm(): Locator {
    return this.page
      .locator("form")
      .filter({ has: this.fieldGroup("Nationality") })
      .first();
  }

  private customFieldsForm(): Locator {
    return this.page
      .locator("form")
      .filter({ has: this.fieldGroup("Blood Type") })
      .first();
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
      .getByText("No Records Found", { exact: true })
      .first();
    await Promise.race([
      row.waitFor({ state: "visible" }),
      noRecords.waitFor({ state: "visible" }),
    ]);
    return row.isVisible();
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
      const fullNameGroup = Array.from(
        document.querySelectorAll<HTMLElement>(".oxd-input-group"),
      ).find((group) =>
        group
          .querySelector("label")
          ?.textContent?.trim()
          .startsWith("Employee Full Name"),
      );
      return fullNameGroup?.querySelector("input")?.value === expectedName;
    }, firstName);
  }

  private employeeFullNameGroup(): Locator {
    return this.page
      .locator(".oxd-input-group")
      .filter({ hasText: "Employee Full Name" })
      .first();
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

  private async fillUniqueEmployeeId(): Promise<void> {
    const employeeId = String(randomInt(1_000_000, 10_000_000));
    await this.employeeIdInput().fill(employeeId);
  }

  private async selectNonPlaceholderOption(label: string): Promise<string> {
    const select = this.fieldGroup(label).locator(".oxd-select-text");
    await select.click();
    const dropdown = this.page.locator(".oxd-select-dropdown:visible").last();
    const options = dropdown.locator(".oxd-select-option");
    await options.first().waitFor({ state: "visible" });

    const optionNames = await options.allInnerTexts();
    const choices = optionNames
      .map((name, index) => ({ name: name.trim(), index }))
      .filter(({ name }) => name && name !== "-- Select --");
    if (choices.length === 0) {
      throw new Error(`No selectable options were available for ${label}.`);
    }

    const choice = choices[Math.floor(Math.random() * choices.length)];
    if (!choice) throw new Error(`Could not select an option for ${label}.`);

    await options.nth(choice.index).click();
    const selectedValue = (await select.innerText()).trim();
    if (selectedValue !== choice.name) {
      throw new Error(
        `Expected ${label} to select "${choice.name}", but it shows "${selectedValue}".`,
      );
    }
    return choice.name;
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

  private async waitForSuccessNotification(message: string): Promise<boolean> {
    try {
      await this.successMessage(message).waitFor({ state: "visible" });
      return true;
    } catch (error) {
      if (error instanceof playwrightErrors.TimeoutError) return false;
      throw error;
    }
  }
}
