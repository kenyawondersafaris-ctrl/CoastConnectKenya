"use strict";

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

async function validateUploadedImage(
  req,
  res,
  next
) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message:
          "Image file is required.",
      });
    }

    const {
      fileTypeFromBuffer,
    } =
      await import("file-type");

    const detectedType =
      await fileTypeFromBuffer(
        req.file.buffer
      );

    if (
      !detectedType ||
      !allowedMimeTypes.includes(
        detectedType.mime
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "The uploaded file is not a valid JPG, PNG, or WebP image.",
      });
    }

    if (
      detectedType.mime !==
      req.file.mimetype
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Image file type does not match its contents.",
      });
    }

    req.detectedFileType =
      detectedType;

    return next();
  } catch (error) {
    console.error(
      "Uploaded image validation error:",
      error
    );

    return next(error);
  }
}

module.exports =
  validateUploadedImage;