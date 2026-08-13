"use strict";

function validateRequest(schema) {
  return function requestValidationMiddleware(
    req,
    res,
    next
  ) {
    const result =
      schema.safeParse({
        body: req.body,
        params: req.params,
        query: req.query,
      });

    if (!result.success) {
      const firstIssue =
        result.error.issues[0];

      return res.status(400).json({
        success: false,
        message:
          firstIssue?.message ||
          "Invalid request.",
      });
    }

    req.validated =
      result.data;

    next();
  };
}

module.exports =
  validateRequest;