module.exports = {
  apps: [
    {
      name: "api_gateway",
      script: "./index.js",
      env_production: {
        NODE_ENV: "production",
        port: 5000,
      },
      env_development: {
        NODE_ENV: "development",
        port: 5000,
      },
    },
  ],
};
