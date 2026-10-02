@sanity
Feature: Authentication

  Scenario: Administrator logs in and reaches the dashboard
    Given I open the OrangeHRM login page
    When I log in as "administrator"
    Then I should see the dashboard
