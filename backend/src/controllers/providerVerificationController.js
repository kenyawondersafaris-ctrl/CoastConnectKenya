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
  let client;

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
      providerNotes,
    } = request.body;

    const qualificationTitleValue =
      String(
        qualificationTitle || ""
      ).trim();

    const institutionNameValue =
      String(
        institutionName || ""
      ).trim();

    const professionalExperienceValue =
      String(
        professionalExperience || ""
      ).trim();

    const providerNotesValue =
      String(
        providerNotes || ""
      ).trim();

    const qualificationYearValue =
      Number(qualificationYear);

    const currentYear =
      new Date().getFullYear();

    const missingFields = [];

    if (!qualificationTitleValue) {
      missingFields.push(
        "Professional Qualification"
      );
    }

    if (!institutionNameValue) {
      missingFields.push(
        "Institution Name"
      );
    }

    if (
      !qualificationYear ||
      !Number.isInteger(
        qualificationYearValue
      ) ||
      qualificationYearValue < 1900 ||
      qualificationYearValue > currentYear
    ) {
      missingFields.push(
        "a valid Year Completed"
      );
    }

    if (!professionalExperienceValue) {
      missingFields.push(
        "Professional Experience"
      );
    }

    if (!providerNotesValue) {
      missingFields.push(
        "Provider Notes"
      );
    }

    if (missingFields.length > 0) {
      return response.status(400).json({
        success: false,
        message:
          `Please complete: ${missingFields.join(", ")}.`,
      });
    }

    const provider =
      await getOrCreateProviderProfile(
        request.user.userId
      );

    const qualificationSummary =
      [
        qualificationTitleValue,
        `Institution: ${institutionNameValue}`,
        `Year completed: ${qualificationYearValue}`,
      ]
        .join(" | ");

    const portfolioDescription =
      professionalExperienceValue;

    client =
      await pool.connect();

    await client.query(
      "BEGIN"
    );

    const existingVerificationResult =
      await client.query(
        `
          SELECT
            id,
            status
          FROM provider_verifications
          WHERE provider_id = $1
          FOR UPDATE
        `,
        [
          provider.id,
        ]
      );

    const existingVerification =
      existingVerificationResult.rows[0];

    if (
      existingVerification?.status ===
      "SUBMITTED"
    ) {

      await client.query(
        "ROLLBACK"
      );

      return response.status(409).json({
        success: false,
        message:
          "Your verification application is currently under review and cannot be changed.",
      });
    }

    const requiresNewReview =
      existingVerification &&
      [
        "REJECTED",
        "APPROVED",
      ].includes(
        existingVerification.status
      );

    const verificationResult =
      await client.query(
        `
          INSERT INTO provider_verifications (
            provider_id,
            qualification_summary,
            portfolio_description,
            provider_notes,
            status,
            reviewed_by,
            reviewed_at,
            admin_notes,
            submitted_at,
            updated_at
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            'DRAFT',
            NULL,
            NULL,
            NULL,
            NULL,
            CURRENT_TIMESTAMP
          )

          ON CONFLICT (provider_id)
          DO UPDATE SET
            qualification_summary =
              EXCLUDED.qualification_summary,

            portfolio_description =
              EXCLUDED.portfolio_description,

            provider_notes =
              EXCLUDED.provider_notes,

            status =
              CASE
                WHEN provider_verifications.status IN (
                  'REJECTED',
                  'APPROVED'
                )
                  THEN 'DRAFT'
                ELSE provider_verifications.status
              END,

            reviewed_by =
              CASE
                WHEN provider_verifications.status IN (
                  'REJECTED',
                  'APPROVED'
                )
                  THEN NULL
                ELSE provider_verifications.reviewed_by
              END,

            reviewed_at =
              CASE
                WHEN provider_verifications.status IN (
                  'REJECTED',
                  'APPROVED'
                )
                  THEN NULL
                ELSE provider_verifications.reviewed_at
              END,

            admin_notes =
              CASE
                WHEN provider_verifications.status IN (
                  'REJECTED',
                  'APPROVED'
                )
                  THEN NULL
                ELSE provider_verifications.admin_notes
              END,

            submitted_at =
              CASE
                WHEN provider_verifications.status IN (
                  'REJECTED',
                  'APPROVED'
                )
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
          qualificationSummary,
          portfolioDescription,
          providerNotesValue,
        ]
      );

    if (requiresNewReview) {

      await client.query(
        `
          UPDATE provider_profiles

          SET
            verification_status = 'PENDING',
            updated_at = CURRENT_TIMESTAMP

          WHERE id = $1
        `,
        [
          provider.id,
        ]
      );
    }

    await client.query(
      "COMMIT"
    );

    return response.json({
      success: true,

      message:
        requiresNewReview
          ? "Verification information updated. Your changes require a new review before approval."
          : "Verification information saved successfully.",

      verification:
        verificationResult.rows[0],
    });

  } catch (error) {

    if (client) {
      try {
        await client.query(
          "ROLLBACK"
        );
      } catch (rollbackError) {
        // Ignore rollback failure.
      }
    }

    next(error);

  } finally {

    if (client) {
      client.release();
    }

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
          SELECT
            id,
            status
          FROM provider_verifications
          WHERE provider_id = $1
        `,
        [
          providerProfile.id,
        ]
      );

    const verification =
      existingVerificationResult.rows[0];

    if (!verification) {
      return response.status(400).json({
        success: false,
        message:
          "Please complete your verification information first.",
      });
    }

    if (
      verification.status !== "DRAFT"
    ) {
      return response.status(409).json({
        success: false,
        message:
          verification.status === "SUBMITTED"
            ? "Your verification application is already under review."
            : verification.status === "APPROVED"
              ? "Your professional verification has already been approved."
              : "Please update your verification information before submitting again.",
      });
    }

    const documentsResult =
      await pool.query(
        `
          SELECT
            COUNT(*)::INTEGER AS count
          FROM
            provider_verification_documents
          WHERE verification_id = $1
        `,
        [
          verification.id,
        ]
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
            AND status = 'DRAFT'

          RETURNING
            id,
            status,
            submitted_at,
            updated_at
        `,
        [
          verification.id,
        ]
      );

    if (
      verificationResult.rows.length === 0
    ) {
      return response.status(409).json({
        success: false,
        message:
          "Your verification status changed. Please refresh and try again.",
      });
    }

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