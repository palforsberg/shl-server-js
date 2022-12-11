module.exports = {
  apps: [{
    name: "shl_server",
    script: "./dist/src/server.js",
    args: "./deployment/config.json",
    env: {
      NODE_ENV: "production",
    },
  }]
}
