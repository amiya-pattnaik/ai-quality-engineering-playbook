Feature: Scheduled transfer support

  Scenario: Create a scheduled transfer for a future date
    Given the user is on the transfer form
    When the user enters a transfer date in the future
    And submits the transfer request
    Then the system shows a scheduled transfer confirmation

  Scenario: Reject a scheduled transfer in the past
    Given the user is on the transfer form
    When the user enters a transfer date in the past
    And submits the transfer request
    Then the system rejects the request with a validation message
