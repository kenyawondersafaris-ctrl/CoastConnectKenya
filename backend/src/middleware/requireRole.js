"use strict";

function requireRole(...allowedRoles) {
  const normalizedRoles = allowedRoles.map((role) =>
    String(role).trim().toUpperCase()
  );

  return function roleMiddleware(req, res, next) {
    const userRole = String(req.user?.role || "")
      .trim()
      .toUpperCase();

    if (!userRole) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!normalizedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      });
    }

    next();
  };
}

module.exports = requireRole;