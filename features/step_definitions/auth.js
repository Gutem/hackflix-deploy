const { Given, When, Then } = require("@cucumber/cucumber");
const assert = require("assert");

Given("the API is running", async function () {
  const res = await fetch(`${this.apiBase}/health`);
  const data = await res.json();
  assert.strictEqual(data.status, "ok");
});

Given("I am not logged in", function () {
  this.token = null;
  this.user = null;
});

When("I login with username {string} and password {string}", async function (username, password) {
  await this.login(username, password);
});

When("I attempt to login {int} times with invalid credentials", async function (count) {
  for (let i = 0; i < count; i++) {
    await this.login(`fake${i}`, "wrong");
  }
});

When("I request the playlist as unauthenticated", async function () {
  await this.apiGet("/api/playlist");
});

Then("I should receive a valid JWT token", function () {
  assert.ok(this.token, "Expected a JWT token");
  assert.ok(this.token.length > 50, "Token too short");
});

Then("my user tier should be {string}", function (expectedTier) {
  assert.ok(this.user, "No user in response");
  assert.strictEqual(this.user.tier, expectedTier);
});

Then("I should have content access", function () {
  assert.ok(this.user.contentAccess, "No content access");
  assert.ok(
    Array.isArray(this.user.contentAccess) || this.user.contentAccess === "all",
    "Invalid contentAccess"
  );
});

Then("I should have access to all content", function () {
  assert.strictEqual(this.user.contentAccess, "all");
});

Then("I should receive an error {string}", function (expectedError) {
  assert.ok(this.response, "No response");
  assert.ok(this.response.error, "No error in response");
  assert.ok(
    this.response.error.includes(expectedError),
    `Expected error "${expectedError}" but got "${this.response.error}"`
  );
});
