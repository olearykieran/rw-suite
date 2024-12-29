import * as functions from "firebase-functions";
import axios from "axios";

export const quickbooksOAuthRedirect = functions.https.onRequest(async (req, res) => {
  // Step 1: redirect user to QuickBooks OAuth URL
});

export const quickbooksOAuthCallback = functions.https.onRequest(async (req, res) => {
  // Step 2: handle callback from QuickBooks with code, exchange for tokens
});

export const createInvoice = functions.https.onCall(async (data, context) => {
  // Create an invoice in QuickBooks
  // data might include orgId, projectId, invoice details, etc.
  // Use stored accessToken in Firestore or functions.config() to call QBO API
  try {
    const accessToken = "someStoredToken";
    const response = await axios.post(
      "https://quickbooks.api.url/v3/company/...",
      {
        // invoice payload
      },
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    return response.data;
  } catch (err) {
    throw new functions.https.HttpsError("unknown", "Failed to create invoice", err);
  }
});
