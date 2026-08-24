const fs = require("fs");
const path = require("path");

require("dotenv").config({
  path: path.join(
    __dirname,
    "../../.env"
  ),
});

const pool = require("../config/db");

async function runSubscriptionsMigration() {
  try {
    const sqlPath = path.join(
      __dirname,
      "../../../database/subscriptions.sql"
    );

    const sql = fs.readFileSync(
      sqlPath,
      "utf8"
    );

    await pool.query(sql);

    console.log(
      "Subscription migration completed successfully."
    );

    await pool.end();

    process.exit(0);

  } catch (error) {

    console.error(
      "Subscription migration failed:",
      error
    );

    await pool.end();

    process.exit(1);
  }
}

runSubscriptionsMigration();