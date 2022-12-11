module.exports = {
  apps: [{
    name: "shl_server",
    script: "./dist/src/server.js",
    args: "./deployment/config.json",

    error_file: "./deployment/error.log",
    log_file: "./deployment/console.log",
    time: true,
    
    env: {
      NODE_ENV: "production",
    },
  }]
}
