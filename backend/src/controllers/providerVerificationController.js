"use strict";

const pool =
  require("../config/db");

const cloudinary =
  require("../config/cloudinary");

  async function getOrCreateProviderProfile(
  userId
) {

  const existingResult =
    await pool.query(
      `
        SELECT
          id,
          verification_status
        FROM provider_profiles
        WHERE user_id = $1
      `,
      [userId]
    );

  if (
    existingResult.rows.length > 0
  ) {
    return existingResult.rows[0];
  }

  const createdResult =
    await pool.query(
      `
        INSERT INTO provider_profiles (
          user_id,
          verification_status,
          availability_status
        )
        VALUES (
          $1,
          'PENDING',
          'AVAILABLE'
        )
        RETURNING
          id,
          verification_status
      `,
      [userId]
    );

  return createdResult.rows[0];
}

/*
|--------------------------------------------------------------------------
| Get My Verification Application
|--------------------------------------------------------------------------
*/

async function getMyVerification(
  request,
  response,
  next
) {
  try {
   const provider =
await getOrCreateProviderProfile(
  request.user.userId
);

    const verificationResult =
      await pool.query(
        `
          SELECT
            id,
            status,
            qualification_summary,
            portfolio_description,
            portfolio_url,
            provider_notes,
            admin_notes,
            submitted_at,
            reviewed_at,
            created_at,
            updated_at
          FROM provider_verifications
          WHERE provider_id = $1
        `,
        [provider.id]
      );

    if (
      verificationResult.rows.length === 0
    ) {
      return response.json({
        success: true,

        verification: null,

        providerVerificationStatus:
          provider.verification_status,

        documents: [],
      });
    }

    const verification =
      verificationResult.rows[0];

    const documentsResult =
      await pool.query(
        `
          SELECT
            id,
            document_type,
            document_name,
            document_url,
            qualification_name,
            issuing_organization,
            document_number,
            expiry_date,
            status,
            admin_notes,
            reviewed_at,
            created_at
          FROM provider_verification_documents
          WHERE verification_id = $1
          ORDER BY created_at DESC
        `,
        [verification.id]
      );

    return response.json({
      success: true,

      verification,

      providerVerificationStatus:
        provider.verification_status,

      documents:
        documentsResult.rows,
    });
  } catch (error) {
    next(error);
  }
}

/*
|--------------------------------------------------------------------------
| Create Or Update Verification Application
|--------------------------------------------------------------------------
*/

async function saveMyVerification(
  request,
  response,
  next
) {
  try {

    console.log(
  "SAVE VERIFICATION BODY:",
  request.body
);
    const {
      qualificationTitle,
      institutionName,
      qualificationYear,
      professionalExperience,
    } = request.body;

    const provider =
      await getOrCreateProviderProfile(
        request.user.userId
      );

    const qualificationSummary =
      [
        qualificationTitle?.trim(),
        institutionName?.trim()
          ? `Institution: ${institutionName.trim()}`
          : null,
        qualificationYear
          ? `Year completed: ${qualificationYear}`
          : null,
      ]
        .filter(Boolean)
        .join(" | ");

    const portfolioDescription =
      professionalExperience?.trim() || null;

    const verificationResult =
      await pool.query(
        `
          INSERT INTO provider_verifications (
            provider_id,
            qualification_summary,
            portfolio_description,
            status,
            updated_at
          )
          VALUES (
            $1,
            $2,
            $3,
            'DRAFT',
            CURRENT_TIMESTAMP
          )
          ON CONFLICT (provider_id)
          DO UPDATE SET
            qualification_summary =
              EXCLUDED.qualification_summary,

            portfolio_description =
              EXCLUDED.portfolio_description,

            status =
              CASE
                WHEN provider_verifications.status = 'SUBMITTED'
                  THEN 'DRAFT'
                ELSE provider_verifications.status
              END,

            submitted_at =
              CASE
                WHEN provider_verifications.status = 'SUBMITTED'
                  THEN NULL
                ELSE provider_verifications.submitted_at
              END,

            updated_at =
              CURRENT_TIMESTAMP

          RETURNING
            id,
            status,
            qualification_summary,
            portfolio_description,
            portfolio_url,
            provider_notes,
            admin_notes,
            submitted_at,
            reviewed_at,
            created_at,
            updated_at
        `,
        [
          provider.id,
          qualificationSummary || null,
          portfolioDescription,
        ]
      );

    return response.json({
      success: true,
      message:
        "Verification information saved successfully.",
      verification:
        verificationResult.rows[0],
    });

  } catch (error) {
    next(error);
  }
}

/*
|--------------------------------------------------------------------------
| Upload Verification Document
|--------------------------------------------------------------------------
*/

async function uploadMyVerificationDocument(
  request,
  response,
  next
) {
  try {
    if (!request.file) {
      return response.status(400).json({
        success: false,
        message:
          "Please select a document to upload.",
      });
    }

    const {
      documentType,
      documentName,
      qualificationName,
      issuingOrganization,
      documentNumber,
      expiryDate,
    } = request.body;

    if (
      !documentType ||
      !documentName
    ) {
      return response.status(400).json({
        success: false,
        message:
          "Document type and document name are required.",
      });
    }

    const provider =
 await getOrCreateProviderProfile(
  request.user.userId
);

    let verificationResult =
      await pool.query(
        `
          SELECT
            id
          FROM provider_verifications
          WHERE provider_id = $1
        `,
        [provider.id]
      );

    let verificationId;

    if (
      verificationResult.rows.length === 0
    ) {
      const createdVerification =
        await pool.query(
          `
            INSERT INTO provider_verifications (
              provider_id,
              status
            )
            VALUES (
              $1,
              'DRAFT'
            )
            RETURNING id
          `,
          [provider.id]
        );

      verificationId =
        createdVerification.rows[0].id;
    } else {
      verificationId =
        verificationResult.rows[0].id;
    }

    const base64File =
      request.file.buffer.toString(
        "base64"
      );

    const dataUri =
      `data:${request.file.mimetype};base64,${base64File}`;

    const uploadResult =
      await cloudinary.uploader.upload(
        dataUri,
        {
          folder:
            "coast-connect/provider-verification",

          resource_type:
            "auto",
        }
      );

    const documentResult =
      await pool.query(
        `
          INSERT INTO
            provider_verification_documents (
              verification_id,
              document_type,
              document_name,
              document_url,
              qualification_name,
              issuing_organization,
              document_number,
              expiry_date,
              status
            )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            'PENDING'
          )
          RETURNING
            id,
            document_type,
            document_name,
            document_url,
            qualification_name,
            issuing_organization,
            document_number,
            expiry_date,
            status,
            created_at
        `,
        [
          verificationId,
          documentType,
          documentName,
          uploadResult.secure_url,
          qualificationName || null,
          issuingOrganization || null,
          documentNumber || null,
          expiryDate || null,
        ]
      );

    return response.status(201).json({
      success: true,

      message:
        "Verification document uploaded successfully.",

      document:
        documentResult.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

/*
|--------------------------------------------------------------------------
| Delete My Verification Document
|--------------------------------------------------------------------------
*/

async function deleteMyVerificationDocument(
  request,
  response,
  next
) {
  try {
    const {
      documentId,
    } = request.params;

    const provider =
  await getOrCreateProviderProfile(
    request.user.userId
  );

const verificationResult =
  await pool.query(
    `
      SELECT id
      FROM provider_verifications
      WHERE provider_id = $1
    `,
    [provider.id]
  );

const verificationId =
  verificationResult.rows[0]?.id ||
  null;

if (!verificationId) {
  return response.status(404).json({
    success: false,
    message:
      "Verification application not found.",
  });
}

    const deleteResult =
      await pool.query(
        `
          DELETE FROM
            provider_verification_documents
          WHERE
            id = $1
            AND verification_id = $2
          RETURNING id
        `,
        [
          documentId,
          verificationId,
        ]
      );

    if (
      deleteResult.rows.length === 0
    ) {
      return response.status(404).json({
        success: false,
        message:
          "Verification document not found.",
      });
    }

    return response.json({
      success: true,
      message:
        "Verification document deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
}

/*
|--------------------------------------------------------------------------
| Submit Verification For Review
|--------------------------------------------------------------------------
*/

async function submitMyVerification(
  request,
  response,
  next
) {
  try {
    const providerProfile =
await getOrCreateProviderProfile(
  request.user.userId
);

const existingVerificationResult =
  await pool.query(
    `
      SELECT id
      FROM provider_verifications
      WHERE provider_id = $1
    `,
    [providerProfile.id]
  );

const verificationId =
  existingVerificationResult.rows[0]?.id ||
  null;

   if (!verificationId) {
      return response.status(400).json({
        success: false,
        message:
          "Please complete your verification information first.",
      });
    }

    const documentsResult =
      await pool.query(
        `
          SELECT COUNT(*)::INTEGER AS count
          FROM
            provider_verification_documents
          WHERE verification_id = $1
        `,
        [verificationId]
      );

    const documentCount =
      documentsResult.rows[0].count;

    if (documentCount < 1) {
      return response.status(400).json({
        success: false,
        message:
          "Please upload at least one verification document before submitting.",
      });
    }

    const verificationResult =
      await pool.query(
        `
          UPDATE provider_verifications
          SET
            status = 'SUBMITTED',

            submitted_at =
              CURRENT_TIMESTAMP,

            updated_at =
              CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING
            id,
            status,
            submitted_at,
            updated_at
        `,
       [verificationId]
      );

    return response.json({
      success: true,

      message:
        "Your verification application has been submitted for review.",

      verification:
        verificationResult.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMyVerification,
  saveMyVerification,
  uploadMyVerificationDocument,
  deleteMyVerificationDocument,
  submitMyVerification,
};