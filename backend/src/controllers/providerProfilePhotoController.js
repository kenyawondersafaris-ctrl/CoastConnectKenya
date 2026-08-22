"use strict";

const streamifier =
  require("streamifier");

const cloudinary =
  require("../config/cloudinary");

function uploadBufferToCloudinary(
  fileBuffer,
  options = {}
) {
  return new Promise(
    (resolve, reject) => {

      const uploadStream =
        cloudinary.uploader.upload_stream(
          options,

          (error, result) => {

            if (error) {
              reject(error);
              return;
            }

            resolve(result);
          }
        );

      streamifier
        .createReadStream(
          fileBuffer
        )
        .pipe(uploadStream);
    }
  );
}

async function uploadMyProfilePhoto(
  req,
  res
) {
  try {

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message:
          "Please select a profile photo to upload.",
      });
    }

    const result =
      await uploadBufferToCloudinary(
        req.file.buffer,
        {
          folder:
            "coast-connect/provider-profiles",

          resource_type:
            "image",

          transformation: [
            {
              width: 800,
              height: 800,
              crop: "limit",
            },

            {
              quality: "auto",
              fetch_format: "auto",
            },
          ],
        }
      );

    return res.status(201).json({
      success: true,

      message:
        "Profile photo uploaded successfully.",

      profilePhoto:
        result.secure_url,
    });

  } catch (error) {

    console.error(
      "Upload provider profile photo error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Unable to upload profile photo.",
    });
  }
}

module.exports = {
  uploadMyProfilePhoto,
};