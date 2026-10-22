const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert");

const {
    sendInterviewConfirmation,
    prepareConfirmationEmail,
    formatInterviewTime,
    validateInterviewDetails,
    isValidInterviewDetails,
    setTransporter,
    resetTransporter
} = require("./index");

const { validateConfig } = require("./mailer");

describe("emailer Module Test Suite (Interview Confirmation)", () => {
    let mockSentEmails = [];
    let mockTransporter;

    beforeEach(() => {
        mockSentEmails = [];

        // Mock transporter intercepts sendMail without contacting any remote server
        mockTransporter = {
            sendMail: async (mailOptions) => {
                mockSentEmails.push(mailOptions);
                return {
                    messageId: `<mock-interview-${Date.now()}@recruitment.internal>`,
                    response: "250 Message accepted"
                };
            }
        };

        setTransporter(mockTransporter);
    });

    afterEach(() => {
        resetTransporter();
    });

    // ==========================================
    // 1. Validation Logic
    // ==========================================
    describe("Validation Logic (validation.js)", () => {
        it("should accept valid interview details", () => {
            const input = {
                name: "Rahul Sharma",
                email: "rahul@example.com",
                time: "2026-10-25T15:00:00+05:30",
                meetingLink: "https://meet.google.com/abc-defg-hij"
            };

            const result = validateInterviewDetails(input);
            assert.strictEqual(result.isValid, true);
            assert.strictEqual(isValidInterviewDetails(input), true);
        });

        it("should accept valid native Date object for time", () => {
            const input = {
                name: "Priya Patel",
                email: "priya@example.com",
                time: new Date("2026-10-25T15:00:00+05:30"),
                meetingLink: "https://meet.example.com/slot"
            };

            const result = validateInterviewDetails(input);
            assert.strictEqual(result.isValid, true);
        });

        it("should reject missing or empty name", () => {
            const emptyName = {
                name: "   ",
                email: "test@example.com",
                time: "2026-10-25T15:00:00+05:30",
                meetingLink: "https://meet.example.com"
            };
            const missingName = {
                email: "test@example.com",
                time: "2026-10-25T15:00:00+05:30",
                meetingLink: "https://meet.example.com"
            };
            const nonStringName = {
                name: 12345,
                email: "test@example.com",
                time: "2026-10-25T15:00:00+05:30",
                meetingLink: "https://meet.example.com"
            };

            assert.strictEqual(validateInterviewDetails(emptyName).isValid, false);
            assert.match(validateInterviewDetails(emptyName).error, /name/i);

            assert.strictEqual(validateInterviewDetails(missingName).isValid, false);
            assert.match(validateInterviewDetails(missingName).error, /name/i);

            assert.strictEqual(validateInterviewDetails(nonStringName).isValid, false);
            assert.match(validateInterviewDetails(nonStringName).error, /name/i);
        });

        it("should reject invalid email formats", () => {
            const invalidEmails = [
                "",
                "   ",
                "plainaddress",
                "@missingusername.com",
                "missingdomain@.com",
                "spaces in@email.com",
                12345,
                null
            ];

            for (const badEmail of invalidEmails) {
                const res = validateInterviewDetails({
                    name: "Candidate",
                    email: badEmail,
                    time: "2026-10-25T15:00:00+05:30",
                    meetingLink: "https://meet.example.com"
                });
                assert.strictEqual(res.isValid, false, `Expected ${badEmail} to fail`);
                assert.match(res.error, /email/i);
            }
        });

        it("should reject missing or invalid interview time", () => {
            const invalidTimes = [
                undefined,
                null,
                "",
                "   ",
                "not-a-valid-date",
                "tomorrow at 3pm",
                NaN
            ];

            for (const badTime of invalidTimes) {
                const res = validateInterviewDetails({
                    name: "Candidate",
                    email: "candidate@example.com",
                    time: badTime,
                    meetingLink: "https://meet.example.com"
                });
                assert.strictEqual(res.isValid, false, `Expected ${badTime} to fail`);
                assert.match(res.error, /time/i);
            }
        });

        it("should reject invalid meeting URLs", () => {
            const invalidUrls = [
                undefined,
                null,
                "",
                "   ",
                "not-a-url",
                "ftp://files.example.com/interview",
                "javascript:alert(1)",
                "meet.google.com/without-protocol"
            ];

            for (const badUrl of invalidUrls) {
                const res = validateInterviewDetails({
                    name: "Candidate",
                    email: "candidate@example.com",
                    time: "2026-10-25T15:00:00+05:30",
                    meetingLink: badUrl
                });
                assert.strictEqual(res.isValid, false, `Expected ${badUrl} to fail`);
                assert.match(res.error, /meetingLink/i);
            }
        });

        it("should reject non-object or null input", () => {
            assert.strictEqual(validateInterviewDetails(null).isValid, false);
            assert.strictEqual(validateInterviewDetails(undefined).isValid, false);
            assert.strictEqual(validateInterviewDetails([]).isValid, false);
            assert.strictEqual(validateInterviewDetails("string input").isValid, false);
        });
    });

    // ==========================================
    // 2. Email Template Preparation
    // ==========================================
    describe("Template Preparation (prepareConfirmationEmail)", () => {
        it("should generate professional confirmation email with formatted time and link", () => {
            const details = {
                name: "Rahul Sharma",
                email: "rahul@example.com",
                time: "2026-10-25T15:00:00+05:30",
                meetingLink: "https://meet.google.com/abc-defg-hij"
            };

            const email = prepareConfirmationEmail(details);
            assert.ok(email);
            assert.strictEqual(email.to, "rahul@example.com");
            assert.strictEqual(email.subject, "Interview Confirmation – Club Recruitment");

            // Check candidate name
            assert.match(email.message, /Rahul Sharma/);
            assert.match(email.html, /Rahul Sharma/);

            // Check interview time
            assert.match(email.message, /October 25, 2026/);
            assert.match(email.html, /October 25, 2026/);
            assert.match(email.message, /3:00 PM/);

            // Check meeting link
            assert.match(email.message, /https:\/\/meet\.google\.com\/abc-defg-hij/);
            assert.match(email.html, /href="https:\/\/meet\.google\.com\/abc-defg-hij"/);

            // Check closing
            assert.match(email.message, /The Recruitment Team/);
            assert.match(email.html, /The Recruitment Team/);
        });

        it("should respect explicit UTC 'Z' timezone", () => {
            const formatted = formatInterviewTime("2026-10-25T10:00:00Z");
            assert.match(formatted, /10:00 AM/);
            assert.match(formatted, /UTC/);
        });

        it("should return null for non-object input", () => {
            assert.strictEqual(prepareConfirmationEmail(null), null);
            assert.strictEqual(prepareConfirmationEmail(undefined), null);
        });
    });

    // ==========================================
    // 3. Public API: sendInterviewConfirmation
    // ==========================================
    describe("Public API (sendInterviewConfirmation)", () => {
        it("should successfully send interview confirmation email", async () => {
            const details = {
                name: "Aarav Gupta",
                email: "aarav@example.com",
                time: "2026-10-25T15:00:00+05:30",
                meetingLink: "https://meet.example.com/aarav"
            };

            const result = await sendInterviewConfirmation(details);

            assert.strictEqual(result.success, true);
            assert.strictEqual(result.recipient, "aarav@example.com");
            assert.ok(result.messageId);

            // Verify the mock received exactly one email with correct parameters
            assert.strictEqual(mockSentEmails.length, 1);
            const sent = mockSentEmails[0];

            assert.strictEqual(sent.to, "aarav@example.com");
            assert.strictEqual(sent.subject, "Interview Confirmation – Club Recruitment");
            assert.match(sent.text, /Aarav Gupta/);
            assert.match(sent.text, /https:\/\/meet\.example\.com\/aarav/);
            assert.match(sent.html, /href="https:\/\/meet\.example\.com\/aarav"/);
        });

        it("should throw validation error on invalid input and NOT trigger a send", async () => {
            const invalidDetails = {
                name: "",
                email: "not-an-email",
                time: "invalid-time",
                meetingLink: "not-a-link"
            };

            await assert.rejects(
                async () => {
                    await sendInterviewConfirmation(invalidDetails);
                },
                /Validation Error/i
            );

            // Ensure transport sendMail was NEVER called
            assert.strictEqual(mockSentEmails.length, 0);
        });

        it("should throw when transporter fails (e.g. SMTP connection error)", async () => {
            const failingTransporter = {
                sendMail: async () => {
                    throw new Error("SMTP connection timeout: 554 Transaction failed");
                }
            };

            const details = {
                name: "Sneha Reddy",
                email: "sneha@example.com",
                time: "2026-10-25T15:00:00+05:30",
                meetingLink: "https://meet.example.com/interview"
            };

            await assert.rejects(
                async () => {
                    await sendInterviewConfirmation(details, failingTransporter);
                },
                /SMTP connection timeout/i
            );
        });
    });

    // ==========================================
    // 4. Configuration Validation
    // ==========================================
    describe("Configuration Validation", () => {
        it("should throw actionable error when EMAIL_USER or EMAIL_APP_PASSWORD is missing", () => {
            const originalUser = process.env.EMAIL_USER;
            const originalPass = process.env.EMAIL_APP_PASSWORD;

            try {
                delete process.env.EMAIL_USER;
                delete process.env.EMAIL_APP_PASSWORD;

                assert.throws(
                    () => {
                        validateConfig();
                    },
                    /Mailer configuration error.*EMAIL_USER.*EMAIL_APP_PASSWORD/i
                );
            } finally {
                if (originalUser) process.env.EMAIL_USER = originalUser;
                if (originalPass) process.env.EMAIL_APP_PASSWORD = originalPass;
            }
        });
    });
});
