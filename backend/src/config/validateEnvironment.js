"use strict";

const requiredVariables = [
  "DATABASE_URL",
  "JWT_SECRET",
  "NODE_ENV",
  "CLOUDINARY_CLOUD_NAME",
 "CLOUDINARY_API_KEY",
 "CLOUDINARY_API_SECRET",
];

if (
  process.env.NODE_ENV ===
  "production"
) {
  requiredVariables.push(
    "FRONTEND_URL"
  );
}
function validateEnvironment() {
  const missingVariables =
    requiredVariables.filter(
      (variableName) =>
        !process.env[variableName]
    );

  if (missingVariables.length > 0) {
    console.error(
      "\nMissing required environment variables:\n"
    );

    missingVariables.forEach(
      (variableName) => {
        console.error(
          `- ${variableName}`
        );
      }
    );

    process.exit(1);
  }
}

module.exports =
  validateEnvironment;