const { When, Then } = require("@cucumber/cucumber");
const assert = require("assert");

When("I request subtitles", async function () {
  const headers = {};
  if (this.token) headers["Authorization"] = `Bearer ${this.token}`;
  this.subtitleResponse = await fetch(
    `${this.apiBase}/api/subtitles?url=https://example.com/test.vtt`,
    { headers }
  );
});

Then("I should receive a 403 error", function () {
  assert.strictEqual(this.subtitleResponse.status, 403);
});

Then("the subtitle proxy should respond", function () {
  assert.ok(this.subtitleResponse.status !== 403, "Subtitle access denied");
  assert.ok(this.subtitleResponse.status !== 401, "Authentication required");
});
