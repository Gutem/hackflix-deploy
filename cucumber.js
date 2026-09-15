/** Cucumber.js configuration */
module.exports = {
  default: {
    paths: ["features/**/*.feature"],
    require: ["features/step_definitions/**/*.js", "features/support/**/*.js"],
    format: ["progress-bar"],
  },
};
