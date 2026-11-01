"""Supportroot AI — Transactional Email Service via Google Apps Script (GAS) Relay.

Sends responsive, branded HTML emails through Google Apps Script without requiring
complex SMTP/OAuth configurations or third-party paid providers.
"""

import logging
import threading
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

# Base styles for emails
EMAIL_WRAPPER = """
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0b14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b0b14; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #161626; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(99, 102, 241, 0.05)); border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
              <table role="presentation" width="100%">
                <tr>
                  <td>
                    <span style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                      Supportroot<span style="color: #a855f7;">AI</span>
                    </span>
                  </td>
                  <td align="right">
                    <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; background: rgba(255,255,255,0.06); padding: 4px 8px; border-radius: 6px;">
                      {tag}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px;">
              {content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #121220; border-top: 1px solid rgba(255, 255, 255, 0.05); text-align: center; color: #64748b; font-size: 12px; line-height: 1.6;">
              <p style="margin: 0;">Sent automatically by <strong>Supportroot AI</strong> &bull; Intelligent Customer Support Platform</p>
              <p style="margin: 4px 0 0;">Need help? Reply to this email or visit your workspace dashboard.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def _send_dispatch(to_email: str, subject: str, html_body: str, text_body: str = None):
    """Internal function that sends payload to Google Apps Script endpoint."""
    gas_url = getattr(settings, "GOOGLE_APPS_SCRIPT_URL", None)
    gas_secret = getattr(settings, "GOOGLE_APPS_SCRIPT_SECRET", "")

    if not gas_url or "YOUR_DEPLOYMENT_ID" in gas_url:
        logger.info(
            f"[Email Simulated] To: {to_email} | Subject: '{subject}' (Set GOOGLE_APPS_SCRIPT_URL to send via Gmail)"
        )
        return

    payload = {
        "to": to_email,
        "subject": subject,
        "html_body": html_body,
        "text_body": text_body or subject,
        "secret_key": gas_secret,
    }

    try:
        response = requests.post(
            gas_url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=8,
        )
        if response.status_code == 200:
            logger.info(f"Email successfully dispatched via GAS to {to_email}")
        else:
            logger.warning(f"GAS returned status {response.status_code}: {response.text}")
    except Exception as e:
        logger.warning(f"Failed to post email to Google Apps Script: {e}")


def send_email_async(to_email: str, subject: str, html_body: str, text_body: str = None):
    """Dispatches email in a background daemon thread so it never blocks HTTP responses."""
    if not to_email:
        return
    thread = threading.Thread(
        target=_send_dispatch,
        args=(to_email.strip(), subject, html_body, text_body),
        daemon=True,
    )
    thread.start()


# =========================================================================
# Case 1: Welcome & Account Registration
# =========================================================================
def send_welcome_email(user_email: str, user_name: str, workspace_name: str):
    """Sent when a new user registers their account."""
    subject = f"Welcome to Supportroot AI, {user_name or 'there'}!"
    content = f"""
      <h2 style="margin: 0 0 16px; color: #ffffff; font-size: 20px;">Welcome to your new AI support platform!</h2>
      <p style="margin: 0 0 16px; color: #cbd5e1; line-height: 1.6; font-size: 14px;">
        Hi {user_name or 'there'}, your account and workspace <strong>{workspace_name}</strong> have been successfully set up.
      </p>
      
      <div style="background: rgba(139, 92, 246, 0.08); border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 12px; padding: 20px; margin: 24px 0;">
        <h3 style="margin: 0 0 10px; color: #c084fc; font-size: 15px;">Next steps to deploy your AI assistant:</h3>
        <ul style="margin: 0; padding-left: 20px; color: #cbd5e1; font-size: 13px; line-height: 1.8;">
          <li>Add documents or website URLs in your <strong>Knowledge Base</strong>.</li>
          <li>Chat with your <strong>AI Assistant</strong> to test knowledge grounded answers.</li>
          <li>Track support tickets and real-time deflection on your <strong>Dashboard</strong>.</li>
        </ul>
      </div>

      <div style="text-align: center; margin: 28px 0 12px;">
        <a href="http://localhost:5173/dashboard" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: #ffffff; padding: 12px 28px; border-radius: 10px; font-weight: 600; text-decoration: none; display: inline-block; font-size: 14px;">
          Go to Your Dashboard &rarr;
        </a>
      </div>
    """
    html = EMAIL_WRAPPER.format(title="Welcome to Supportroot AI", tag="Account Ready", content=content)
    send_email_async(user_email, subject, html)


# =========================================================================
# Case 2: Password Reset / Security OTP
# =========================================================================
def send_password_reset_email(user_email: str, reset_token_or_code: str):
    """Sent when a user requests a password reset link or code."""
    subject = "Reset your Supportroot AI password"
    reset_link = f"http://localhost:5173/login?reset_token={reset_token_or_code}"
    content = f"""
      <h2 style="margin: 0 0 16px; color: #ffffff; font-size: 20px;">Password Reset Request</h2>
      <p style="margin: 0 0 16px; color: #cbd5e1; line-height: 1.6; font-size: 14px;">
        We received a request to reset your password for your Supportroot AI account associated with <strong>{user_email}</strong>.
      </p>

      <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
        <span style="font-size: 12px; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px;">Verification Code</span>
        <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #c084fc; margin: 12px 0;">
          {reset_token_or_code}
        </div>
        <p style="margin: 0; color: #64748b; font-size: 12px;">This code expires in 15 minutes.</p>
      </div>

      <div style="text-align: center; margin: 24px 0;">
        <a href="{reset_link}" style="background: #8b5cf6; color: #ffffff; padding: 12px 28px; border-radius: 10px; font-weight: 600; text-decoration: none; display: inline-block; font-size: 14px;">
          Reset Password Directly
        </a>
      </div>

      <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin-top: 24px;">
        If you did not request a password reset, you can safely ignore this email. Your account remains secure.
      </p>
    """
    html = EMAIL_WRAPPER.format(title="Password Reset", tag="Security", content=content)
    send_email_async(user_email, subject, html)


# =========================================================================
# Case 3: Ticket Generated (Confirmation to Customer)
# =========================================================================
def send_ticket_created_customer_email(ticket):
    """Sent to the customer when a new support ticket is generated."""
    if not ticket.customer_email:
        return

    subject = f"Support Ticket {ticket.ticket_number} Created: {ticket.subject}"
    priority_color = {
        "high": "#ef4444",
        "medium": "#f59e0b",
        "low": "#10b981",
    }.get(ticket.priority, "#f59e0b")

    content = f"""
      <h2 style="margin: 0 0 16px; color: #ffffff; font-size: 20px;">We've received your request!</h2>
      <p style="margin: 0 0 16px; color: #cbd5e1; line-height: 1.6; font-size: 14px;">
        Hi {ticket.customer_name}, your support request has been logged and assigned to our team. Here are the details of your ticket:
      </p>

      <table role="presentation" width="100%" style="border-collapse: collapse; margin: 20px 0; background: rgba(255,255,255,0.03); border-radius: 10px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08);">
        <tr>
          <td style="padding: 12px 16px; color: #94a3b8; font-size: 13px; border-bottom: 1px solid rgba(255,255,255,0.06); width: 140px;">Ticket Number:</td>
          <td style="padding: 12px 16px; color: #ffffff; font-weight: 700; font-size: 13px; border-bottom: 1px solid rgba(255,255,255,0.06);">{ticket.ticket_number}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; color: #94a3b8; font-size: 13px; border-bottom: 1px solid rgba(255,255,255,0.06);">Subject:</td>
          <td style="padding: 12px 16px; color: #ffffff; font-size: 13px; border-bottom: 1px solid rgba(255,255,255,0.06);">{ticket.subject}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; color: #94a3b8; font-size: 13px; border-bottom: 1px solid rgba(255,255,255,0.06);">Priority:</td>
          <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: {priority_color}; text-transform: capitalize; border-bottom: 1px solid rgba(255,255,255,0.06);">{ticket.priority}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; color: #94a3b8; font-size: 13px; vertical-align: top;">Description:</td>
          <td style="padding: 12px 16px; color: #cbd5e1; font-size: 13px; line-height: 1.6;">{ticket.description or 'No additional details provided.'}</td>
        </tr>
      </table>

      <p style="margin: 16px 0; color: #cbd5e1; line-height: 1.6; font-size: 14px;">
        Our support agents will review your inquiry shortly. Standard response times are typically under 2 hours.
      </p>
    """
    html = EMAIL_WRAPPER.format(title="Ticket Created", tag=ticket.ticket_number, content=content)
    send_email_async(ticket.customer_email, subject, html)


# =========================================================================
# Case 4: Ticket Alert to Support Team / Admin
# =========================================================================
def send_ticket_alert_team_email(ticket, team_email: str):
    """Notifies the internal workspace team/agent that a new ticket requires attention."""
    if not team_email:
        return

    subject = f"🚨 New Ticket {ticket.ticket_number}: {ticket.subject} ({ticket.priority.upper()})"
    content = f"""
      <h2 style="margin: 0 0 12px; color: #ffffff; font-size: 20px;">New Ticket Generated</h2>
      <p style="margin: 0 0 16px; color: #cbd5e1; font-size: 14px;">
        A customer has submitted a new support inquiry or escalated from the AI Assistant:
      </p>

      <div style="background: rgba(255, 255, 255, 0.04); border-left: 4px solid #8b5cf6; padding: 16px; border-radius: 4px; margin-bottom: 20px;">
        <p style="margin: 0 0 8px; font-weight: 700; color: #ffffff; font-size: 15px;">{ticket.subject}</p>
        <p style="margin: 0; color: #94a3b8; font-size: 13px;">Customer: <strong>{ticket.customer_name}</strong> ({ticket.customer_email or 'No email'})</p>
      </div>

      {f'''
      <div style="background: rgba(139, 92, 246, 0.08); border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <span style="font-size: 11px; text-transform: uppercase; color: #c084fc; font-weight: 700; letter-spacing: 0.5px;">AI Analysis Summary:</span>
        <p style="margin: 8px 0 0; color: #e2e8f0; font-size: 13px; line-height: 1.5;">{ticket.ai_analysis}</p>
      </div>
      ''' if ticket.ai_analysis else ''}

      <div style="text-align: center; margin: 24px 0 12px;">
        <a href="http://localhost:5173/tickets/{ticket.id}" style="background: #8b5cf6; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: 600; text-decoration: none; display: inline-block; font-size: 13px;">
          View & Respond to Ticket &rarr;
        </a>
      </div>
    """
    html = EMAIL_WRAPPER.format(title="Team Ticket Alert", tag="Team Alert", content=content)
    send_email_async(team_email, subject, html)


# =========================================================================
# Case 5: Ticket Status Update / Resolved (to Customer)
# =========================================================================
def send_ticket_status_update_email(ticket):
    """Sent to the customer when a ticket status changes (e.g., resolved or in progress)."""
    if not ticket.customer_email:
        return

    is_resolved = ticket.status == "resolved"
    subject = (
        f"Ticket {ticket.ticket_number} Resolved: {ticket.subject}"
        if is_resolved
        else f"Update on Ticket {ticket.ticket_number}: Status changed to {ticket.status.replace('_', ' ').capitalize()}"
    )

    content = f"""
      <h2 style="margin: 0 0 16px; color: #ffffff; font-size: 20px;">
        {f'Your ticket {ticket.ticket_number} is resolved!' if is_resolved else f'Update on Ticket {ticket.ticket_number}'}
      </h2>
      <p style="margin: 0 0 16px; color: #cbd5e1; line-height: 1.6; font-size: 14px;">
        Hi {ticket.customer_name}, your support request <strong>"{ticket.subject}"</strong> has been updated to:
        <span style="display: inline-block; padding: 2px 8px; border-radius: 6px; font-weight: 600; font-size: 12px; background: {'rgba(16, 185, 129, 0.2); color: #34d399;' if is_resolved else 'rgba(59, 130, 246, 0.2); color: #60a5fa;'}">
          {ticket.status.replace('_', ' ').upper()}
        </span>
      </p>

      {f'''
      <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 12px; padding: 20px; margin: 20px 0;">
        <span style="font-size: 11px; text-transform: uppercase; color: #34d399; font-weight: 700;">Resolution Response:</span>
        <p style="margin: 8px 0 0; color: #f1f5f9; font-size: 14px; line-height: 1.6;">{ticket.suggested_response}</p>
      </div>
      ''' if (is_resolved and ticket.suggested_response) else ''}

      <p style="margin: 20px 0 0; color: #94a3b8; font-size: 13px; line-height: 1.5;">
        If you have any further questions or if this issue requires additional attention, simply reply to this email to reopen your ticket.
      </p>
    """
    html = EMAIL_WRAPPER.format(title="Ticket Updated", tag=ticket.status.upper(), content=content)
    send_email_async(ticket.customer_email, subject, html)
