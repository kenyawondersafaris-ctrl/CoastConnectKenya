"use strict";

const cloudinary = require("../config/cloudinary");

function uploadBufferToCloudinary(fileBuffer) {
  return new Promise((resolve, reject) => {
    const uploadStream =
      cloudinary.uploader.upload_stream(
        {
          folder:
            "coast-connect-kenya/menu-items",

          resource_type: "image",

          transformation: [
            {
              width: 1200,
              height: 900,
              crop: "limit",
              quality: "auto",
              fetch_format: "auto",
            },
          ],
        },
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(result);
        }
      );

    uploadStream.end(fileBuffer);
  });
}

async function uploadMenuImage(request, response) {
  try {
    if (!request.file) {
      return response.status(400).json({
        success: false,
        message: "Choose an image to upload.",
      });
    }

    const uploadResult =
      await uploadBufferToCloudinary(
        request.file.buffer
      );

    return response.status(201).json({
      success: true,
      message:
        "Menu image uploaded successfully.",

      image: {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
      },
    });
  } catch (error) {
    console.error(
      "Upload menu image error:",
      error
    );

    return response.status(500).json({
      success: false,
      message:
        "Unable to upload the menu image.",
    });
  }
}

module.exports = {
  uploadMenuImage,
};