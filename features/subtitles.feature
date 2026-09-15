Feature: Subtitle Access Control
  As a Hackflix user
  I want subtitles to be available only for premium subscribers
  So that basic users cannot access premium subtitle features

  Background:
    Given the API is running

  Scenario: Basic user cannot access subtitles
    Given I am logged in as "demo"
    When I request subtitles
    Then I should receive a 403 error

  Scenario: Premium user can access subtitles
    Given I am logged in as "premium"
    When I request subtitles
    Then the subtitle proxy should respond

  Scenario: Admin user can access subtitles
    Given I am logged in as "admin"
    When I request subtitles
    Then the subtitle proxy should respond
