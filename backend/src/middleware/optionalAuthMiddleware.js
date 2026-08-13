"use strict";

const jwt =
  require("jsonwebtoken");

function optionalAuthenticate(
  req,
  res,
  next
) {
  try {
    const authHeader =
      req.headers.authorization;

    if (
      !authHeader ||
      !authHeader.startsWith(
        "Bearer "
      )
    ) {
      req.user = null;
      return next();
    }

    const token =
      authHeader.split(" ")[1];

    const decoded =
      jwt.verify(
        token,
        process.env.JWT_SECRET
      );

    req.user = decoded;

    return next();
  } catch (error) {
    req.user = null;
    return next();
  }
}

module.exports =
  optionalAuthenticate;