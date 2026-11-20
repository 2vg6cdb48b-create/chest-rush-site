// Settings live in app.json. This only adds the web address prefix when building the
// browser version for a sub-folder of a website (see scripts/build-web-preview.js).
module.exports = ({ config }) => {
  const baseUrl = process.env.EXPO_BASE_URL;
  if (!baseUrl) return config;
  return { ...config, experiments: { ...config.experiments, baseUrl } };
};
