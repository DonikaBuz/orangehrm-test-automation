@regression
Feature: PIM employee management

  Background:
    Given I am logged in as "administrator"

  @sensitive
  Scenario: Create an employee with login credentials and verify saved details
    Given I am on the Add Employee page
    When I add an employee profile
    And I add the employee credentials
    Then the success notification should be shown
    And the saved employee details should match the profile

  Scenario: Create an employee and update personal, custom, and attachment details
    When I create an employee
    Then the employee creation should be confirmed
    When I update the employee's personal details
    Then the personal details should be saved
    When I update the employee's custom fields
    Then the custom fields should be saved
    When I attach an image to the employee
    Then the attachment should be saved

  Scenario: Create a PIM report using employment status and display employee first names
    When I create the PIM report "Test Automation Report"
    Then the report should be saved successfully
    And the report name should be displayed

  Scenario: Delete a PIM report I created
    When I create and delete a PIM report named "Test Automation Report"
    Then my PIM report should be created and deleted successfully

  Scenario: Delete an employee I created
    When I create an employee
    And I open the delete confirmation for my employee
    Then the delete confirmation should be shown
    When I confirm deleting my employee
    Then the employee should be deleted successfully