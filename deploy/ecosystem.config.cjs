module.exports = {
  apps: [
    {
      name: "threeweeq-web",
      cwd: "/var/www/threeweeq",
      script: "npm",
      args: "run start",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "900M",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
      time: true,
    },
    {
      name: "threeweeq-api",
      cwd: "/var/www/threeweeq/medusa",
      script: "npm",
      args: "run start",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "1400M",
      env: {
        NODE_ENV: "production",
        PORT: "9000",
      },
      time: true,
    },
  ],
}
