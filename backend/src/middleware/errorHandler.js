"use strict";

function errorHandler(
  error,
  req,
  res,
  next
) {
  console.error(
    "Unhandled application error:",
    error
  );

  if (res.headersSent) {
    return next(error);
  }

  const statusCode =
    Number(error.statusCode) || 500;

  return res.status(statusCode).json({
    success: false,
    message:
      statusCode === 500
        ? "An unexpected server error occurred."
        : error.message,
  });
}

module.exports =
  errorHandler;