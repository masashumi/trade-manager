module.exports = {
  apps: [
    {
      name: 'trade-manager',
      script: 'server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    }
  ]
}
