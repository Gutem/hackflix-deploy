/**
 * On-screen keyboard for Android TV.
 *
 * Android TV WebViews report `inputType=0` to the IME, so no soft keyboard
 * is ever shown — leaving a TV user unable to type credentials with only a
 * remote. This renders a self-contained D-pad navigable keyboard instead of
 * depending on the box's IME.
 *
 * Loaded by hackflix.js (TV mode) and directly by login.html.
 * @module packages/web/public/js/tv-keyboard
 */
(function () {
  if (window.__hfTvKeyboard) return;
  window.__hfTvKeyboard = true;

  var ROWS = [
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l", "@"],
    ["z", "x", "c", "v", "b", "n", "m", ".", "_", "-"],
    ["SHIFT", "SPACE", "DEL", "DONE"],
  ];

  var LABELS = { SHIFT: "⇧", SPACE: "espaço", DEL: "⌫", DONE: "OK" };

  var target = null;
  var root = null;
  var shift = false;

  function isTextInput(el) {
    return el && /^(INPUT|TEXTAREA)$/.test(el.tagName) &&
      !/^(checkbox|radio|submit|button|range|file)$/i.test(el.type || "");
  }

  /** Insert text at the caret, keeping the caret after what we typed. */
  function insert(text) {
    if (!target) return;
    var start = target.selectionStart;
    var end = target.selectionEnd;
    if (start === null || start === undefined) start = end = target.value.length;
    target.value = target.value.slice(0, start) + text + target.value.slice(end);
    var caret = start + text.length;
    target.setSelectionRange(caret, caret);
    target.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function backspace() {
    if (!target) return;
    var start = target.selectionStart;
    var end = target.selectionEnd;
    if (start === null || start === undefined) start = end = target.value.length;
    if (start === end && start > 0) start--;
    target.value = target.value.slice(0, start) + target.value.slice(end);
    target.setSelectionRange(start, start);
    target.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function press(key) {
    if (key === "SHIFT") {
      shift = !shift;
      render();
      return;
    }
    if (key === "SPACE") return insert(" ");
    if (key === "DEL") return backspace();
    if (key === "DONE") {
      hide();
      // Let the page keep the caret where the user left it.
      if (target) target.blur();
      return;
    }
    insert(shift ? key.toUpperCase() : key);
    if (shift) { shift = false; render(); }
  }

  function render() {
    if (!root) return;
    var html = "";
    for (var r = 0; r < ROWS.length; r++) {
      html += '<div class="tvkb-row">';
      for (var c = 0; c < ROWS[r].length; c++) {
        var k = ROWS[r][c];
        var label = LABELS[k] || (shift && k.length === 1 ? k.toUpperCase() : k);
        var wide = (k === "SHIFT" || k === "SPACE" || k === "DEL" || k === "DONE")
          ? " tvkb-wide" : "";
        var on = (k === "SHIFT" && shift) ? " tvkb-on" : "";
        html += '<button type="button" class="tvkb-key' + wide + on +
          '" data-key="' + k + '" tabindex="0">' + label + "</button>";
      }
      html += "</div>";
    }
    root.innerHTML = html;
  }

  function show(el) {
    target = el;
    if (!root) {
      root = document.createElement("div");
      root.className = "tvkb";
      root.setAttribute("role", "group");
      root.setAttribute("aria-label", "Teclado na tela");
      document.body.appendChild(root);
      render();
      root.addEventListener("click", function (e) {
        var btn = e.target.closest(".tvkb-key");
        if (btn) press(btn.dataset.key);
      });
      // Keep the keyboard above the content and out of the D-pad's way.
      root.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") return; // handled by click
        if (e.key === "Escape") { hide(); e.stopPropagation(); }
      });
    }
    root.style.display = "block";
    document.body.classList.add("tvkb-open");
  }

  function hide() {
    target = null;
    if (root) root.style.display = "none";
    document.body.classList.remove("tvkb-open");
  }

  document.addEventListener("focusin", function (e) {
    if (!document.documentElement.classList.contains("tv")) return;
    if (isTextInput(e.target)) show(e.target);
    else if (root && !root.contains(e.target)) hide();
  }, true);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && root && root.style.display === "block") hide();
  });

  window.HackflixTvKeyboard = { show: show, hide: hide, press: press };
})();
