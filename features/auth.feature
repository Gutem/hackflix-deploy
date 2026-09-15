Feature: Authentication
  As a user of Hackflix
  I want to sign in with my credentials
  So that I can access video content

  Background:
    Given the API is running

  Scenario: Login with valid credentials
    When I login with username "demo" and password "demo"
    Then I should receive a valid JWT token
    And my user tier should be "basic"
    And I should have content access

  Scenario: Login with invalid credentials
    When I login with username "demo" and password "wrongpassword"
    Then I should receive an error "Invalid credentials"

  Scenario: Login with empty credentials
    When I login with username "" and password ""
    Then I should receive an error "Username and password required"

  Scenario: Login with premium account
    When I login with username "premium" and password "premium"
    Then my user tier should be "premium"
    And I should have access to all content

  Scenario: Admin login
    When I login with username "admin" and password "hackflix"
    Then my user tier should be "admin"

  Scenario: Unauthenticated access is denied
    Given I am not logged in
    When I request the playlist as unauthenticated
    Then I should receive an error "Authentication required"
