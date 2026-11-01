/**
 * Supportroot AI — Google Apps Script Email Relay
 * 
 * Instructions:
 * 1. Open https://script.google.com/home
 * 2. Click "+ New project"
 * 3. Replace all contents of Code.gs with this file
 * 4. Click "Deploy" > "New deployment"
 * 5. Click the gear icon next to "Select type" and choose "Web app"
 * 6. Set:
 *    - Description: "Supportroot AI Email Relay"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone" (allows Django backend to post)
 * 7. Click "Deploy", review permissions, and grant access
 * 8. Add a Script Property named SHARED_SECRET with a strong random value.
 * 9. Copy the Web App URL (ends in /exec) into GOOGLE_APPS_SCRIPT_URL.
 * 10. Set the same secret in Django as GOOGLE_APPS_SCRIPT_SECRET.
 */

function doGet(e) {
  return ContentService.createTextOutput(
    JSON.stringify({
      status: "active",
      service: "Supportroot AI Email Relay",
      timestamp: new Date().toISOString(),
    })
  ).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(
        JSON.stringify({ status: "error", message: "No post data received." })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    const payload = JSON.parse(e.postData.contents);

    const sharedSecret = PropertiesService.getScriptProperties().getProperty("SHARED_SECRET");
    if (!sharedSecret || payload.secret_key !== sharedSecret) {
      return ContentService.createTextOutput(
        JSON.stringify({ status: "error", message: "Invalid shared secret." })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    const recipient = payload.to;
    const subject = payload.subject || "Notification from Supportroot AI";
    const htmlBody = payload.html_body || "<p>Supportroot AI notification</p>";
    const textBody = payload.text_body || "Supportroot AI notification";

    if (!recipient) {
      return ContentService.createTextOutput(
        JSON.stringify({ status: "error", message: "Missing recipient 'to' email." })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    MailApp.sendEmail({
      to: recipient,
      subject: subject,
      body: textBody,
      htmlBody: htmlBody,
      name: "Supportroot AI",
    });

    return ContentService.createTextOutput(
      JSON.stringify({
        status: "success",
        recipient: recipient,
        subject: subject,
        dispatched_at: new Date().toISOString(),
      })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({
        status: "error",
        message: error.toString(),
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
