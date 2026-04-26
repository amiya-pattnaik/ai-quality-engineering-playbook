Feature: Scheduled transfer API

  Scenario: Create a scheduled transfer
    Given base URL is "http://localhost:3000"
    When I POST "/api/transfers"
      | amount        | 250.00     |
      | sourceAccount | checking   |
      | targetAccount | savings    |
      | transferDate  | 2026-05-01 |
    Then response status should be 200
    And response body should contain key "id"

  Scenario: Get scheduled transfer details
    Given base URL is "http://localhost:3000"
    When I GET "/api/transfers/12345"
    Then response status should be 200
    And response body should contain key "status"
