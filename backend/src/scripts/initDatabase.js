const fs = require("fs");
const path = require("path");
const pool = require("../config/db");

async function initializeDatabase() {
  try {
    const schemaPath = path.join(__dirname, "../../../database/schema.sql");
    const sql = fs.readFileSync(schemaPath, "utf8");

    await pool.query(sql);

    console.log("✅ Database initialized successfully.");

    process.exit(0);
  } catch (error) {
    console.error("❌ Database initialization failed.");
    console.error(error);

    process.exit(1);
  }
}

initializeDatabase();