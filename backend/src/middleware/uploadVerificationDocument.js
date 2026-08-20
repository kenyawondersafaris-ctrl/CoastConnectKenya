"use strict";

const multer = require("multer");

const storage =
  multer.memoryStorage();

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

function verificationDocumentFilter(
  request,
  file,
  callback
) {
  if (
    !allowedMimeTypes.includes(
      file.mimetype
    )
  ) {
    const error = new Error(
      "Only JPG, PNG, WebP, and PDF documents are allowed."
    );

    error.statusCode = 400;

    callback(error);
    return;
  }

  callback(null, true);
}

const uploadVerificationDocument =
  multer({
    storage,

    limits: {
      fileSize:
        10 * 1024 * 1024,

      files: 1,
    },

    fileFilter:
      verificationDocumentFilter,
  });

module.exports =
  uploadVerificationDocument;