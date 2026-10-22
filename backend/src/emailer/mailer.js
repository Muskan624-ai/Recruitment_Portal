const path = require("path");

// Load environment variables from cwd, backend root (.env), or adjacent
require("dotenv").config();
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

/**
 * Validates that essential SMTP environment variables are present.
 * Throws actionable error without exposing sensitive credentials.
 */
function validateConfig() {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
        throw new Error(
            "Mailer configuration error: EMAIL_USER and EMAIL_APP_PASSWORD environment variables are required."
        );
    }
}

/**
 * Creates the standard nodemailer transporter configured for Gmail.
 * Reads credentials securely from environment variables.
 */
function createDefaultTransporter() {
    validateConfig();

    let nodemailer;
    try {
        nodemailer = require("nodemailer");
    } catch {
        throw new Error(
            "Mailer configuration error: 'nodemailer' module is not installed. Please install nodemailer in dependencies to use the default SMTP transporter."
        );
    }

    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD
        }
    });
}

let activeTransporter = null;
let isCustomTransporter = false;

/**
 * Replaces the active transporter (useful for unit and integration testing
 * to ensure no real emails are ever dispatched).
 *
 * @param {Object} transporter
 */
function setTransporter(transporter) {
    activeTransporter = transporter;
    isCustomTransporter = true;
}

/**
 * Returns the currently active transporter, lazily creating the default
 * transporter if no custom transporter has been set.
 *
 * @returns {Object}
 */
function getTransporter() {
    if (!activeTransporter) {
        activeTransporter = createDefaultTransporter();
    }
    return activeTransporter;
}

/**
 * Resets the transporter back to an uninitialized state.
 */
function resetTransporter() {
    activeTransporter = null;
    isCustomTransporter = false;
}

/**
 * Resolves a safe 'From' address derived from configuration.
 * Avoids default placeholder emails (e.g. your_club_email@gmail.com).
 *
 * @returns {string}
 */
function resolveFromAddress() {
    const user = process.env.EMAIL_USER;
    const configuredFrom = process.env.EMAIL_FROM;

    if (configuredFrom && !configuredFrom.includes("your_club_email@gmail.com")) {
        return configuredFrom;
    }

    if (user) {
        return `Club Recruitment Team <${user}>`;
    }

    return "Club Recruitment Team";
}

/**
 * Sends an email using the active or provided transporter.
 *
 * @param {Object} email
 * @param {string} email.to - Recipient email address
 * @param {string} email.subject - Subject line
 * @param {string} [email.message] - Plain text content
 * @param {string} [email.text] - Alternative key for plain text content
 * @param {string} [email.html] - Optional rich HTML formatted body
 * @param {Object} [customTransporter] - Optional custom transporter (for testing/mocking)
 */
async function sendEmail(email, customTransporter = null) {
    const transporterToUse = customTransporter || (isCustomTransporter ? activeTransporter : getTransporter());
    const fromAddress = resolveFromAddress();
    const replyToAddress = process.env.EMAIL_REPLY_TO || process.env.EMAIL_USER;

    const mailOptions = {
        from: fromAddress,
        to: email.to,
        replyTo: email.replyTo || replyToAddress,
        subject: email.subject,
        text: email.message || email.text,
        headers: {
            "X-Priority": "3",
            "Importance": "Normal"
        }
    };

    if (email.html) {
        mailOptions.html = email.html;
    }

    return transporterToUse.sendMail(mailOptions);
}

module.exports = {
    sendEmail,
    setTransporter,
    getTransporter,
    resetTransporter,
    resolveFromAddress,
    validateConfig
};
