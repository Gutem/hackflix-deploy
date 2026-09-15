// Stop video/audio on navigation
document.addEventListener("htmx:beforeSwap", () => {
  document.querySelectorAll("video, audio").forEach(function (el) {
    el.pause();
    el.removeAttribute("src");
    el.load();
  });
});

// Sync nav active state
function syncActiveNav() {
  var path = window.location.pathname;
  document.querySelectorAll(".site-nav a").forEach(function (a) {
    var href = a.getAttribute("href") || "";
    var match = path === href ||
      (href !== "/" && path.startsWith(href)) ||
      (href === "/conferences/" && path.startsWith("/conference/")) ||
      (href === "/documentaries/" && path.startsWith("/documentary/"));
    a.classList.toggle("active", match);
  });
}
document.addEventListener("DOMContentLoaded", syncActiveNav);
document.addEventListener("htmx:afterSettle", syncActiveNav);