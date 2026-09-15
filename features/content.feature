Feature: Content Access
  As a Hackflix user
  I want to browse and search video content
  So that I can find talks to watch

  Background:
    Given I am logged in as "demo"

  Scenario: Basic user sees limited content
    When I request the playlist
    Then I should receive at least 50 videos
    And all videos should be from CCC conferences

  Scenario: Premium user sees all content
    Given I am logged in as "premium"
    When I request the playlist
    Then I should receive at least 5000 videos
    And videos should include multiple sources

  Scenario: Content detail loads correctly
    When I request the playlist
    And I get the first video's detail
    Then the video should have a title, source, and conference

  Scenario: Search returns relevant results
    When I search for "security"
    Then I should receive at least 5 results
    And results should contain "security" in their metadata

  Scenario: Conference list shows edition counts
    When I request the conference list
    Then I should see at least 200 conferences
    And each conference should have edition and video counts
