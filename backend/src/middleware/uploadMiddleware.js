"use strict";

const multer = require("multer");

const storage = multer.memoryStorage();

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

function imageFileFilter(
  request,
  file,
  callback
) {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    const error = new Error(
      "Only JPG, PNG, and WebP images are allowed."
    );

    error.statusCode = 400;

    callback(error);
    return;
  }

  callback(null, true);
}

const uploadImage = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },

  fileFilter: imageFileFilter,
});

module.exports = uploadImage;