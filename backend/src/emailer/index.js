/**
 * Recruitment Portal - Interview Confirmation Emailer Module
 * Public interface for sending interview confirmation emails after candidate slot confirmation.
 *
 * Usage:
 * ```javascript
 * const { sendInterviewConfirmation } = require("./emailer");
 *
 * await sendInterviewConfirmation({
 *   name: "Candidate Name",
 *   email: "candidate@example.com",
 *   time: "2026-10-25T15:00:00+05:30",
 *   meetingLink: "https://meet.google.com/abc-defg-hij"
 * });
 * ```
 */

const {
    sendInterviewConfirmation,
    prepareConfirmationEmail,
    formatInterviewTime
} = require("./emailService");

const {
    validateInterviewDetails,
    isValidInterviewDetails
} = require("./validation");

const {
    sendEmail,
    setTransporter,
    getTransporter,
    resetTransporter
} = require("./mailer");

module.exports = {
    // Primary API
    sendInterviewConfirmation,

    // Template and formatting utilities
    prepareConfirmationEmail,
    formatInterviewTime,

    // Validation utilities
    validateInterviewDetails,
    isValidInterviewDetails,

    // Low-level mailer & transporter helpers (useful for mocking and testing)
    sendEmail,
    setTransporter,
    getTransporter,
    resetTransporter
};
