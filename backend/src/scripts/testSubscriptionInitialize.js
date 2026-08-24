"use strict";

require("dotenv").config();

const jwt = require("jsonwebtoken");
const axios = require("axios");

async function test() {
  const token = jwt.sign(
    {
      userId: "PASTE_EXISTING_PROVIDER_USER_UUID",
      role: "PROVIDER",
      roles: ["PROVIDER"],
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "10m",
    }
  );

  const response = await axios.post(
    "http://localhost:5000/api/subscriptions/initialize",
    {
      planId:
        "e7e22bb7-20ca-4598-aa5b-b996a55722fe",
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  console.log(
    JSON.stringify(
      response.data,
      null,
      2
    )
  );
}

test().catch((error) => {
  console.error(
    error.response?.data ||
    error.message
  );

  process.exit(1);
});