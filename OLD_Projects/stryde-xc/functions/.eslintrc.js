module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  rules: {
    "quotes": ["error", "double"],
    "max-len": "off", // This is the rule we added
  }, // <--- The comma was likely missing here or after another property
  parserOptions: {
    "ecmaVersion": 2020,
  },
};
