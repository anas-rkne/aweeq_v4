import { defineConfig, loadEnv } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS || "http://localhost:3000",
      adminCors: process.env.ADMIN_CORS || "http://localhost:7001",
      authCors:
        process.env.AUTH_CORS ||
        "http://localhost:3000,http://localhost:7001",
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  admin: {
    backendUrl: process.env.MEDUSA_BACKEND_URL || "http://localhost:9000",
    storefrontUrl:
      process.env.MEDUSA_STOREFRONT_URL || "http://localhost:3000",
  },
  modules: [
    {
      resolve: "./src/modules/threeweeq",
    },
    {
      // Local disk storage for catalog media. `backend_url` is what the admin
      // and the storefront will see in the returned file URL, so it must be
      // the public API origin in production (MEDUSA_BACKEND_URL).
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/file-local",
            id: "local",
            options: {
              upload_dir: process.env.MEDIA_UPLOAD_DIR || "static",
              private_upload_dir:
                process.env.MEDIA_PRIVATE_UPLOAD_DIR || "static-private",
              backend_url:
                (process.env.MEDUSA_BACKEND_URL || "http://localhost:9000") +
                "/static",
            },
          },
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "./src/modules/payment-tap",
            id: "tap",
            options: {
              apiKey: process.env.TAP_SECRET_KEY,
              webhookSecret: process.env.TAP_WEBHOOK_SECRET,
              baseUrl: process.env.TAP_BASE_URL,
              redirectUrl: process.env.TAP_REDIRECT_URL,
            },
          },
          {
            resolve: "./src/modules/payment-stripe",
            id: "stripe",
            options: {
              apiKey: process.env.STRIPE_SECRET_KEY,
              webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
              baseUrl: process.env.STRIPE_BASE_URL,
            },
          },
        ],
      },
    },
  ],
})
