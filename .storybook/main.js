/** @type { import('@storybook/html').StorybookConfig } */
export default {
  stories: ["../../web/src/stories/**/*.stories.@(js|jsx|ts|tsx)"],
  addons: ["@storybook/addon-essentials"],
  framework: {
    name: "@storybook/html",
    options: {},
  },
  staticDirs: ["../../web/public"],
};
