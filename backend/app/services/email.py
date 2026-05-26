import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib

from app.config import settings

logger = logging.getLogger(__name__)


async def send_verification_email(to_email: str, name: str, token: str) -> bool:
    """Send a verification email with a confirmation link."""
    verify_url = f"{settings.APP_URL}/verify?token={token}"

    html = f"""
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #0f0e0d;">Welcome to ResuMatch, {name}!</h2>
        <p style="color: #7a7670; line-height: 1.6;">
            Please verify your email address by clicking the button below.
        </p>
        <a href="{verify_url}"
           style="display: inline-block; padding: 12px 24px; background: #1a3cff;
                  color: white; text-decoration: none; border-radius: 8px;
                  font-weight: 600; margin: 16px 0;">
            Verify Email
        </a>
        <p style="color: #7a7670; font-size: 13px; margin-top: 24px;">
            Or copy this link: {verify_url}
        </p>
        <p style="color: #d8d3c9; font-size: 11px; margin-top: 32px;">
            If you didn't create this account, ignore this email.
        </p>
    </div>
    """

    if not settings.SMTP_HOST:
        # No SMTP configured — log the link instead
        logger.info(f"[DEV] Verification link for {to_email}: {verify_url}")
        print(f"\n>>> Verification link for {to_email}: {verify_url}\n")
        return True

    msg = MIMEMultipart("alternative")
    msg["From"] = settings.SMTP_FROM or settings.SMTP_USER
    msg["To"] = to_email
    msg["Subject"] = "Verify your ResuMatch account"
    msg.attach(MIMEText(html, "html"))

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            start_tls=True,
        )
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False
