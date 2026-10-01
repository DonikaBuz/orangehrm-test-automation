@regression
Feature: PIM employee management

  Background:
    Given I am logged in as "administrator"

  @sensitive
  Scenario: Create an employee with enabled login credentials
    Given I am on the Add Employee page
    When I add an employee profile
    And I add the employee credentials
    Then the success notification should be shown
    And the new employee's personal details should be displayed

  Scenario: Find a newly created employee using the assigned employee ID
    When I create an employee
    And I search for the employee using their assigned employee ID
    Then the employee should be listed in the search results

  Scenario: Update an employee's nationality
    When I create an employee
    And I update the employee's nationality
    Then the selected nationality should be saved

  Scenario: Delete an employee I created
    When I create an employee
    And I open the delete confirmation for my employee
    Then the delete confirmation should be shown
    When I confirm deleting my employee
    Then the employee should be deleted successfully

  Scenario: Require employee names
    When I submit the employee form without names
    Then required name validation should be shown
