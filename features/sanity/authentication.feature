@sanity
Feature: Authentication

  Scenario: administrator logs in successfully
    Given I open the OrangeHRM login page
    When I log in with the administrator account
    Then I should be on the dashboard
