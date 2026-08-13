const {
  updateAuthenticatedUser,
  changeAuthenticatedUserPassword,
} = require(
  "../controllers/userController"
);



const express = require("express");
const authenticate = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.get("/profile", authenticate, (req, res) => {
  res.json({
    success: true,
    message: "Protected route accessed successfully",
    user: req.user,
  });
});

router.get(
  "/customer-area",
  authenticate,
  allowRoles("CUSTOMER"),
  (req, res) => {
    res.json({
      success: true,
      message: "Customer area accessed successfully",
      user: req.user,
    });
  }
);

router.get(
  "/provider-area",
  authenticate,
  allowRoles("PROVIDER"),
  (req, res) => {
    res.json({
      success: true,
      message: "Provider area accessed successfully",
      user: req.user,
    });
  }
);

router.patch(
  "/profile",
  authenticate,
  updateAuthenticatedUser
);

router.patch(
  "/password",
  authenticate,
  changeAuthenticatedUserPassword
);

module.exports = router;