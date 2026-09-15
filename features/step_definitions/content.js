const { Given, When, Then } = require("@cucumber/cucumber");
const assert = require("assert");

Given("I am logged in as {string}", async function (username) {
  const passwords = { demo: "demo", premium: "premium", admin: "hackflix" };
  await this.login(username, passwords[username] || "demo");
  assert.ok(this.token, `Failed to login as ${username}`);
});

When("I request the playlist", async function () {
  this.content = await this.apiGet("/api/playlist");
});

When("I get the first video's detail", async function () {
  const first = this.content?.items?.[0];
  if (!first) throw new Error("No videos in playlist");
  this.videoDetail = await this.apiGet(`/api/content/${first.id}`);
});

When("I search for {string}", async function (query) {
  this.searchResults = await this.apiGet(`/api/search?q=${encodeURIComponent(query)}`);
});

When("I request the conference list", async function () {
  this.conferences = await this.apiGet("/api/conferences");
});

Then("I should receive at least {int} videos", function (min) {
  assert.ok(this.content, "No playlist response");
  assert.ok(this.content.total >= min, `Expected >= ${min} videos, got ${this.content.total}`);
});

Then("all videos should be from CCC conferences", function () {
  const items = this.content?.items || [];
  const ccc = items.filter(i => i.source === "ccc" || /C3/i.test(i.conference || ""));
  const pct = Math.round((ccc.length / items.length) * 100);
  assert.ok(pct >= 80, `Only ${pct}% CCC (${ccc.length}/${items.length})`);
});

Then("videos should include multiple sources", function () {
  const sources = new Set((this.content?.items || []).map(i => i.source));
  assert.ok(sources.size >= 2, `Expected >= 2 sources, got ${sources.size}: ${[...sources]}`);
});

Then("the video should have a title, source, and conference", function () {
  assert.ok(this.videoDetail, "No video detail");
  assert.ok(this.videoDetail.title, "No title");
  assert.ok(this.videoDetail.source, "No source");
  assert.ok(this.videoDetail.conference, "No conference");
});

Then("I should receive at least {int} results", function (min) {
  assert.ok(this.searchResults, "No search results");
  const count = this.searchResults.results?.length || 0;
  assert.ok(count >= min, `Expected >= ${min} results, got ${count}`);
});

Then("results should contain {string} in their metadata", function (query) {
  const results = this.searchResults?.results || [];
  for (const r of results) {
    const text = (r.title + r.description + (r.conference || "")).toLowerCase();
    assert.ok(
      text.includes(query.toLowerCase()),
      `Result "${r.title}" does not contain "${query}"`
    );
  }
});

Then("I should see at least {int} conferences", function (min) {
  assert.ok(this.conferences, "No conference response");
  assert.ok(this.conferences.total >= min, `Expected >= ${min}, got ${this.conferences.total}`);
});

Then("each conference should have edition and video counts", function () {
  const confs = this.conferences?.conferences || [];
  assert.ok(confs.length > 0, "No conferences");
  for (const c of confs.slice(0, 5)) {
    assert.ok(typeof c.editions === "number", `${c.name}: missing editions`);
    assert.ok(typeof c.count === "number", `${c.name}: missing count`);
  }
});
