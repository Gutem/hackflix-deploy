/**
 * Cucumber World — shared state across steps.
 * Provides Playwright browser + API helpers.
 */
const { Before, After, setWorldConstructor, setDefaultTimeout } = require("@cucumber/cucumber");

setDefaultTimeout(60000);

Before({ tags: "@skip-in-test" }, function () {
  if (process.env.NODE_ENV === "test") return "skipped";
});

class HackflixWorld {
  constructor({ parameters }) {
    this.apiBase = process.env.API_URL || "http://localhost:3001";
    this.webBase = process.env.WEB_URL || "http://localhost:4321";
    this.token = null;
    this.response = null;
    this.user = null;
    this.content = null;
  }

  async login(username, password) {
    const res = await fetch(`${this.apiBase}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    this.response = await res.json();
    if (this.response.token) {
      this.token = this.response.token;
      this.user = this.response.user;
    }
    return this.response;
  }

  async apiGet(path) {
    const headers = {};
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;
    const res = await fetch(`${this.apiBase}${path}`, { headers });
    this.response = await res.json();
    return this.response;
  }

  async apiPost(path, body) {
    const headers = { "Content-Type": "application/json" };
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;
    const res = await fetch(`${this.apiBase}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    this.response = await res.json();
    return this.response;
  }
}

setWorldConstructor(HackflixWorld);
