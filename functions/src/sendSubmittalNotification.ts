// functions/src/sendSubmittalNotification.ts

import * as nodemailer from "nodemailer";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { defineSecret } from "firebase-functions/params";

const EMAIL_USER = defineSecret("EMAIL_USER");
const EMAIL_PASS = defineSecret("EMAIL_PASS");

/**
 * We assume submittals at:
 * organizations/{orgId}/projects/{projectId}/subprojects/{subProjectId}/submittals/{submittalId}
 */
export const onSubmittalWrite = onDocumentWritten(
  {
    document:
      "organizations/{orgId}/projects/{projectId}/subprojects/{subProjectId}/submittals/{submittalId}",
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
      if (!afterSnap?.exists) {
        logger.log("Submittal was deleted. No email sent.");
        return;
      }

      const data = afterSnap.data() || {};
      const wasCreated = !beforeSnap;
      const submittalId = event.params.submittalId;
      const subject = data.subject || `Submittal: ${submittalId}`;

      const beforeData = beforeSnap?.data() || {};

      // Gather recipients
      const recipients: string[] = [];
      if (typeof data.createdByEmail === "string" && data.createdByEmail.includes("@")) {
        recipients.push(data.createdByEmail);
      }
      if (typeof data.assignedTo === "string" && data.assignedTo.includes("@")) {
        recipients.push(data.assignedTo);
      }
      if (Array.isArray(data.distributionList)) {
        for (const dist of data.distributionList) {
          if (typeof dist === "string" && dist.includes("@")) {
            recipients.push(dist);
          }
        }
      }
      // ccList
      if (Array.isArray(data.ccList)) {
        for (const cc of data.ccList) {
          if (typeof cc === "string" && cc.includes("@")) {
            recipients.push(cc);
          }
        }
      }

      if (recipients.length === 0) {
        recipients.push("admin@rwprojects.com");
      }

      // Build a body
      let bodyText = `Submittal Details:
Subject: ${data.subject}
Type: ${data.submittalType || "N/A"}
Version: ${data.version || 1}
Created By: ${data.createdByEmail || "Unknown"}
Assigned To: ${data.assignedTo || "N/A"}
Importance: ${data.importance || "N/A"}
Status: ${data.status || "N/A"}
`;

      // Show newly added attachments
      const oldAtt = Array.isArray(beforeData.attachments) ? beforeData.attachments : [];
      const newAtt = Array.isArray(data.attachments) ? data.attachments : [];
      const addedAtt = newAtt.filter((url: string) => !oldAtt.includes(url));

      if (newAtt.length > 0) {
        bodyText += `\nAttachments:\n`;
        for (const url of newAtt) {
          bodyText += ` - ${url}\n`;
        }
      }
      if (!wasCreated && addedAtt.length > 0) {
        bodyText += `\nNewly Added Attachments:\n`;
        for (const url of addedAtt) {
          bodyText += ` - ${url}\n`;
        }
      }

      // Workflow changes?
      const oldWorkflow = Array.isArray(beforeData.workflow) ? beforeData.workflow : [];
      const newWorkflow = Array.isArray(data.workflow) ? data.workflow : [];
      // see if any step changed from pending => approved/rejected
      const changedSteps: string[] = [];
      for (let i = 0; i < newWorkflow.length; i++) {
        const step = newWorkflow[i];
        const oldStep = oldWorkflow[i] || {};
        if (step.status && step.status !== oldStep.status && !wasCreated) {
          changedSteps.push(
            `Workflow step for ${step.role} changed from ${oldStep.status || "none"} to ${
              step.status
            }`
          );
        }
      }
      if (changedSteps.length > 0) {
        bodyText += `\nWorkflow Updates:\n${changedSteps.join("\n")}\n`;
      }

      bodyText += `\n(You are receiving this email because you are part of this submittal.)`;

      const mailOptions = {
        from: `"RW Suite" <${user}>`,
        to: recipients,
        subject: wasCreated
          ? `New Submittal Created: ${subject}`
          : `Submittal Updated: ${subject}`,
        text: bodyText,
      };

      await transporter.sendMail(mailOptions);
      logger.log(
        wasCreated
          ? `Email sent for new Submittal: ${subject}`
          : `Email sent for updated Submittal: ${subject}`
      );
    } catch (err) {
      logger.error("Error sending Submittal email:", err);
    }
  }
);
