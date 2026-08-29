"use strict";

require("dotenv").config();require("dotenv").config({
  path: __dirname + "/.env",
});

const pool =
  require("./src/config/db");

async function run() {
  try {
    await pool.query(`
      ALTER TABLE restaurants
      ADD COLUMN IF NOT EXISTS
        mpesa_payment_type VARCHAR(20),

      ADD COLUMN IF NOT EXISTS
        mpesa_business_number VARCHAR(30),

      ADD COLUMN IF NOT EXISTS
        mpesa_account_number VARCHAR(100),

      ADD COLUMN IF NOT EXISTS
        mpesa_payment_enabled BOOLEAN
          NOT NULL DEFAULT FALSE;
    `);

    console.log(
      "Restaurant payment fields added successfully."
    );
  } catch (error) {
    console.error(
      "Add restaurant payment fields error:",
      error
    );
  } finally {
    await pool.end();
  }
}

run();