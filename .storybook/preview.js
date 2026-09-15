import "../../src/styles/global.css";

/** @type { import('@storybook/html').Preview } */
const preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    backgrounds: { default: "dark", values: [{ name: "dark", value: "#141414" }] },
  },
};

export default preview;

// Helper to render with global styles
export function render(html) {
  return `<div style="min-height:100vh;background:var(--color-bg-primary);color:var(--color-text-primary);font-family:var(--font-family-primary);padding:2rem">
    ${html}
  </div>`;
}
