"use strict";

const express = require("express");

const {
  getProviders,
  getProviderDetails,
  getMyProviderProfile,
  createMyProviderProfile,
  updateMyAvailability,
  getMyProviderBookings,
  updateProviderBookingStatus,
} = require("../controllers/providerController");

const {
  getMyVerification,
  saveMyVerification,
  uploadMyVerificationDocument,
  deleteMyVerificationDocument,
  submitMyVerification,
} = require(
  "../controllers/providerVerificationController"
);

const {
  uploadMyProfilePhoto,
} = require(
  "../controllers/providerProfilePhotoController"
);

const uploadVerificationDocument =
  require(
    "../middleware/uploadVerificationDocument"
  );

const uploadImage =
  require(
    "../middleware/uploadMiddleware"
  );

const {
  getMyProviderServices,
  createMyProviderService,
  updateMyProviderService,
  deleteMyProviderService,
} = require("../controllers/providerServiceController");

const authenticate =
  require("../middleware/authMiddleware");

const requireRole =
  require("../middleware/requireRole");

 const requireActiveProviderSubscription =
  require(
    "../middleware/requireActiveProviderSubscription"
  );

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Public Provider Marketplace
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  getProviders
);

/*
|--------------------------------------------------------------------------
| Logged-in Provider Profile
|--------------------------------------------------------------------------
*/

router.get(
  "/me",
  authenticate,
  requireRole("PROVIDER"),
  getMyProviderProfile
);


router.post(
  "/me/profile-photo",
  authenticate,
  requireRole("PROVIDER"),
  uploadImage.single(
    "profilePhoto"
  ),
  uploadMyProfilePhoto
);
router.post(
  "/me",
  authenticate,
  requireRole("PROVIDER"),
  createMyProviderProfile
);

router.patch(
  "/me/availability",
  authenticate,
  requireRole("PROVIDER"),
  requireActiveProviderSubscription,
  updateMyAvailability
);

router.get(
  "/me/bookings",
  authenticate,
  requireRole("PROVIDER"),
  getMyProviderBookings
);

router.patch(
  "/me/bookings/:bookingId/status",
  authenticate,
  requireRole("PROVIDER"),
  requireActiveProviderSubscription,
  updateProviderBookingStatus
);
/*
|--------------------------------------------------------------------------
| Logged-in Provider Services
|--------------------------------------------------------------------------
*/

router.get(
  "/me/services",
  authenticate,
  requireRole("PROVIDER"),
  getMyProviderServices
);

router.post(
  "/me/services",
  authenticate,
  requireRole("PROVIDER"),
  requireActiveProviderSubscription,
  createMyProviderService
);

router.patch(
  "/me/services/:serviceId",
  authenticate,
  requireRole("PROVIDER"),
  requireActiveProviderSubscription,
  updateMyProviderService
);

router.delete(
  "/me/services/:serviceId",
  authenticate,
  requireRole("PROVIDER"),
  requireActiveProviderSubscription,
  deleteMyProviderService
);

/*
|--------------------------------------------------------------------------
| Public Provider Details
|--------------------------------------------------------------------------
| Keep this dynamic route last.
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Logged-in Provider Verification
|--------------------------------------------------------------------------
*/

router.get(
  "/me/verification",
  authenticate,
  requireRole("PROVIDER"),
  getMyVerification
);

router.put(
  "/me/verification",
  authenticate,
  requireRole("PROVIDER"),
  saveMyVerification
);

router.post(
  "/me/verification/documents",
  authenticate,
  requireRole("PROVIDER"),
  uploadVerificationDocument.single(
    "document"
  ),
  uploadMyVerificationDocument
);

router.delete(
  "/me/verification/documents/:documentId",
  authenticate,
  requireRole("PROVIDER"),
  deleteMyVerificationDocument
);

router.post(
  "/me/verification/submit",
  authenticate,
  requireRole("PROVIDER"),
  submitMyVerification
);

router.get(
  "/:providerId",
  getProviderDetails
);

module.exports = router;