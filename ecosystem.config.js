module.exports = {
  apps: [{
    name: 'nextmove-kundenportal',
    script: './server.js',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
}
