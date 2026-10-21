const { sendEmail } = require("./mailer");
const { validateInterviewDetails } = require("./validation");

/**
 * Formats an interview date/time string or Date object.
 *
 * Timezone Handling:
 * 1. Explicit timezone offsets in ISO strings (e.g., "+05:30", "-04:00", "Z")
 *    are respected and preserved directly.
 * 2. If no timezone is specified in the input string, or a native Date object is provided,
 *    the date is formatted according to the project convention:
 *    Indian Standard Time (IST / Asia/Kolkata, UTC+05:30).
 *
 * @param {string|Date|number} timeInput - Date/time to format
 * @returns {string} Formatted human-readable date and time string
 */
function formatInterviewTime(timeInput) {
    if (!timeInput) return "";

    // 1. If string with explicit ISO-style offset (e.g. 2026-10-25T15:00:00+05:30 or Z)
    if (typeof timeInput === "string") {
        const isoMatch = timeInput.match(
            /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:(Z)|([+-]\d{2}):?(\d{2}))?$/i
        );

        if (isoMatch) {
            const [, year, month, day, hour, minute, , isUtc, offsetHour, offsetMin] = isoMatch;
            const monthNames = [
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ];
            const mIdx = parseInt(month, 10) - 1;
            const monthName = monthNames[mIdx] || month;

            let h = parseInt(hour, 10);
            const m = minute;
            const ampm = h >= 12 ? "PM" : "AM";
            h = h % 12 || 12;
            const formattedTime = `${h}:${m} ${ampm}`;

            let tzLabel = "";
            if (isUtc) {
                tzLabel = " (UTC)";
            } else if (offsetHour !== undefined) {
                const tzSign = offsetHour.startsWith("-") ? "-" : "+";
                const cleanHour = offsetHour.replace(/^[+-]/, "");
                const tzStr = `UTC${tzSign}${cleanHour}:${offsetMin}`;
                tzLabel = (tzStr === "UTC+05:30") ? " (IST)" : ` (${tzStr})`;
            } else {
                // Default project convention timezone: IST
                tzLabel = " (IST)";
            }

            // Determine day of the week
            const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            const localDate = new Date(Date.UTC(parseInt(year, 10), mIdx, parseInt(day, 10)));
            const dayOfWeek = isNaN(localDate.getTime()) ? "" : `${dayNames[localDate.getUTCDay()]}, `;

            return `${dayOfWeek}${monthName} ${parseInt(day, 10)}, ${year} at ${formattedTime}${tzLabel}`;
        }
    }

    // 2. Native Date objects or other parseable date strings
    const date = new Date(timeInput);
    if (isNaN(date.getTime())) {
        return String(timeInput);
    }

    try {
        const formatter = new Intl.DateTimeFormat("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
            timeZone: "Asia/Kolkata",
            timeZoneName: "short"
        });
        return formatter.format(date);
    } catch {
        return date.toLocaleString();
    }
}

/**
 * Prepares the interview confirmation email content (subject, text body, and HTML body).
 *
 * @param {Object} details
 * @param {string} details.name - Candidate name
 * @param {string} details.email - Candidate email
 * @param {string|Date} details.time - Interview date and time
 * @param {string} details.meetingLink - Video meeting URL
 * @returns {Object|null} Email options object or null if invalid
 */
function prepareConfirmationEmail(details) {
    if (!details || typeof details !== "object") {
        return null;
    }

    const candidateName = (details.name || "Candidate").trim();
    const candidateEmail = (details.email || "").trim();
    const meetingLink = (details.meetingLink || "").trim();
    const formattedTime = formatInterviewTime(details.time);

    const subject = "Interview Confirmation – Club Recruitment";

    const message = `Dear ${candidateName},

Your interview slot for our recruitment drive has been successfully confirmed.

Interview Details:
- Date & Time: ${formattedTime}
- Meeting Link: ${meetingLink}

Please join the meeting link at your scheduled time. We recommend testing your audio, video, and internet connection a few minutes before the session begins.

If you have any questions, feel free to reply directly to this email.

Best regards,
The Recruitment Team`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 20px; background-color: #f7fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
    <tr>
      <td style="background-color: #2b6cb0; padding: 24px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 22px;">Club Recruitment</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 28px 24px;">
        <h2 style="color: #2b6cb0; margin-top: 0;">Interview Confirmed</h2>
        <p>Dear ${candidateName},</p>
        <p>Your interview slot for our recruitment drive has been successfully confirmed.</p>

        <div style="background-color: #ebf8ff; border-left: 4px solid #3182ce; padding: 16px; margin: 24px 0; border-radius: 4px;">
          <p style="margin: 0 0 10px 0;"><strong>Date &amp; Time:</strong> ${formattedTime}</p>
          <p style="margin: 0;"><strong>Meeting Link:</strong> <a href="${meetingLink}" target="_blank" style="color: #3182ce; text-decoration: underline;">${meetingLink}</a></p>
        </div>

        <p>Please click the meeting link above at your scheduled time. We recommend joining a few minutes early to ensure your audio and video setup is ready.</p>
        <p>If you experience any issues or need to reach out, you may reply directly to this email.</p>

        <p style="margin-top: 32px; margin-bottom: 4px;">Best regards,</p>
        <p style="margin: 0; font-weight: bold; color: #4a5568;">The Recruitment Team</p>
      </td>
    </tr>
    <tr>
      <td style="background-color: #edf2f7; padding: 16px; text-align: center; font-size: 12px; color: #718096;">
        This is an official communication from the Club Recruitment Team.
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

    return {
        to: candidateEmail,
        subject,
        message,
        text: message,
        html,
        formattedTime,
        meetingLink
    };
}

/**
 * Validates, prepares, and immediately sends an interview confirmation email.
 *
 * @param {Object} details - Interview confirmation payload
 * @param {string} details.name - Candidate name
 * @param {string} details.email - Candidate email
 * @param {string|Date} details.time - Interview time
 * @param {string} details.meetingLink - Meeting URL
 * @param {Object} [customTransporter] - Optional custom transporter (for testing/mocking)
 * @returns {Promise<{ success: boolean, recipient: string, messageId: string }>}
 */
async function sendInterviewConfirmation(details, customTransporter = null) {
    const validation = validateInterviewDetails(details);
    if (!validation.isValid) {
        throw new Error(`Validation Error: ${validation.error}`);
    }

    const emailData = prepareConfirmationEmail(details);
    if (!emailData) {
        throw new Error("Unable to prepare email: invalid candidate details.");
    }

    const info = await sendEmail(emailData, customTransporter);

    return {
        success: true,
        recipient: details.email.trim(),
        messageId: info?.messageId || "sent"
    };
}

module.exports = {
    formatInterviewTime,
    prepareConfirmationEmail,
    sendInterviewConfirmation
};
