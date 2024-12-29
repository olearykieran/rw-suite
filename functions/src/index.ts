import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';

admin.initializeApp();

const db = admin.firestore();

/**
 * Example: Firestore trigger that sends an email when a new project is created
 * under /organizations/{orgId}/projects/{projectId}
 */
export const onNewProject = functions.firestore
  .document('organizations/{orgId}/projects/{projectId}')
  .onCreate(async (snapshot, context) => {
    const projectData = snapshot.data();
    const orgId = context.params.orgId;

    // Use functions config for credentials:
    // firebase functions:config:set email.user="..." email.pass="..."
    const user = functions.config().email.user;
    const pass = functions.config().email.pass;
    if (!user || !pass) {
      console.warn('Email credentials not set in functions config.');
      return;
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail', // or custom SMTP
      auth: { user, pass }
    });

    const mailOptions = {
      from: `"RW Projects" <${user}>`,
      to: 'admin@rwprojects.com', // or dynamic recipients
      subject: `New Project Created in Org ${orgId}`,
      text: `Project data: ${JSON.stringify(projectData, null, 2)}`
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('Email sent for new project:', projectData.name);
    } catch (err) {
      console.error('Error sending email:', err);
    }
  });
