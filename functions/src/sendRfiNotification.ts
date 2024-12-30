// functions/src/sendRfiNotification.ts

import * as nodemailer from "nodemailer";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { defineSecret } from "firebase-functions/params";

/**
 * We assume the RFI docs have fields like:
 *   - createdByEmail (string)
 *   - assignedTo (string)
 *   - distributionList (string[])
 *   - attachments (string[] of URLs)
 *   - subject, status, etc.
 */
const EMAIL_USER = defineSecret("EMAIL_USER");
const EMAIL_PASS = defineSecret("EMAIL_PASS");

export const onRfiWrite = onDocumentWritten(
  {
    document:
      "organizations/{orgId}/projects/{projectId}/subprojects/{subProjectId}/rfis/{rfiId}",
    secrets: [EMAIL_USER, EMAIL_PASS],
  },
  async (event) => {
    try {
      const user = EMAIL_USER.value();
      const pass = EMAIL_PASS.value();

      if (!user || !pass) {
        logger.warn("Email credentials not set in secrets.");
        return;
      }

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user, pass },
      });

      const beforeSnap = event.data?.before;
      const afterSnap = event.data?.after;

      // If doc was deleted, do nothing
      if (!afterSnap?.exists) {
        logger.log("RFI was deleted. No email sent.");
        return;
      }

      // Current data of the RFI
      const rfiData = afterSnap.data() || {};
      // If you want to highlight newly added attachments, get old data
      const beforeData = beforeSnap?.data() || {};

      // Determine if newly created or updated
      const wasCreated = !beforeSnap;
      const subject = rfiData.subject || `RFI: ${event.params.rfiId}`;

      // Build recipients
      const recipients: string[] = [];

      // 1) RFI creator
      if (
        typeof rfiData.createdByEmail === "string" &&
        rfiData.createdByEmail.includes("@")
      ) {
        recipients.push(rfiData.createdByEmail);
      }
      // 2) assignedTo
      if (typeof rfiData.assignedTo === "string" && rfiData.assignedTo.includes("@")) {
        recipients.push(rfiData.assignedTo);
      }
      // 3) distributionList
      if (Array.isArray(rfiData.distributionList)) {
        for (const dist of rfiData.distributionList) {
          if (typeof dist === "string" && dist.includes("@")) {
            recipients.push(dist);
          }
        }
      }
      // 4) Fallback
      if (recipients.length === 0) {
        recipients.push("admin@rwprojects.com");
      }

      // Build the main body
      let bodyText = `RFI Details:
Subject: ${rfiData.subject}
Created By: ${rfiData.createdByEmail || "Unknown"}
Assigned To: ${rfiData.assignedTo || "N/A"}
Importance: ${rfiData.importance || "N/A"}
Status: ${rfiData.status || "N/A"}
`;

      // If you want to see *all* attachments in the doc
      if (Array.isArray(rfiData.attachments) && rfiData.attachments.length > 0) {
        bodyText += `\nAttachments:\n`;
        rfiData.attachments.forEach((url: string) => {
          bodyText += ` - ${url}\n`;
        });
      }

      // Optionally highlight newly added attachments since last update
      // (comment this out if not needed)
      const oldAtt = Array.isArray(beforeData.attachments) ? beforeData.attachments : [];
      const newAtt = Array.isArray(rfiData.attachments) ? rfiData.attachments : [];
      const addedAtt = newAtt.filter((url: string) => !oldAtt.includes(url));
      if (!wasCreated && addedAtt.length > 0) {
        bodyText += `\nNewly added attachments:\n`;
        addedAtt.forEach((url) => {
          bodyText += ` - ${url}\n`;
        });
      }

      // End note
      bodyText += `\n(You are receiving this email because you are part of this RFI.)`;

      const mailOptions = {
        from: `"RW Suite" <${user}>`,
        to: recipients,
        subject: wasCreated ? `New RFI Created: ${subject}` : `RFI Updated: ${subject}`,
        text: bodyText,
      };

      await transporter.sendMail(mailOptions);

      logger.log(
        wasCreated
          ? `Email sent for new RFI: ${subject}`
          : `Email sent for updated RFI: ${subject}`
      );
    } catch (err) {
      logger.error("Error sending RFI email:", err);
    }
  }
);
