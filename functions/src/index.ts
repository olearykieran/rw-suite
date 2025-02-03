// functions/src/index.ts
"use strict";

/**
 * This file shows how to use Firebase v2 Secrets (EMAIL_USER, EMAIL_PASS) for nodemailer,
 * and how to include dynamic recipient logic for the "onNewProject" trigger.
 * It also re-exports the "onRfiWrite" function from sendRfiNotification.ts.
 */

import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { defineSecret } from "firebase-functions/params";

// Initialize Admin SDK once here
admin.initializeApp();

// 1) Define your Secrets
const EMAIL_USER = defineSecret("EMAIL_USER");
const EMAIL_PASS = defineSecret("EMAIL_PASS");

/**
 * Example Firestore trigger: "onNewProject" v2
 * Triggers when a new project document is created at:
 *   organizations/{orgId}/projects/{projectId}
 */
export const onNewProject = onDocumentCreated(
  {
    document: "organizations/{orgId}/projects/{projectId}",
    secrets: [EMAIL_USER, EMAIL_PASS], // <–– grant this function access to secrets
  },
  async (event) => {
    try {
      const snapshot = event.data;
      const projectData = snapshot?.data() || {};
      const { orgId, projectId } = event.params;

      // Retrieve email credentials from Secrets
      const user = EMAIL_USER.value();
      const pass = EMAIL_PASS.value();

      if (!user || !pass) {
        logger.warn("Email credentials not set in secrets.");
        return;
      }

      // Build dynamic recipients
      const recipients: string[] = [];

      // If project has a 'createdByEmail', add it
      if (
        typeof projectData.createdByEmail === "string" &&
        projectData.createdByEmail.includes("@")
      ) {
        recipients.push(projectData.createdByEmail);
      }

      // If project has a distributionList array
      if (Array.isArray(projectData.distributionList)) {
        for (const address of projectData.distributionList) {
          if (typeof address === "string" && address.includes("@")) {
            recipients.push(address);
          }
        }
      }

      // If no recipients found, fallback
      if (recipients.length === 0) {
        recipients.push("admin@rwprojects.com");
      }

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user, pass },
      });

      const mailOptions = {
        from: `"RW Projects" <${user}>`,
        to: recipients, // send to array of emails
        subject: `New Project Created in Org ${orgId}`,
        text: `Project data for ${projectId}:\n${JSON.stringify(projectData, null, 2)}`,
      };

      await transporter.sendMail(mailOptions);
      logger.log("Email sent for new project:", projectData?.name || projectId);
    } catch (err) {
      logger.error("Error sending email for new project:", err);
    }
  }
);

/**
 * 2) Import & export the onRfiWrite function from sendRfiNotification.ts
 * This function triggers on new or updated RFI documents and sends email.
 */

import { onSubmittalWrite } from "./sendSubmittalNotification";
export { onSubmittalWrite };
