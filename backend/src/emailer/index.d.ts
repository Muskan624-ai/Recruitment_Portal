/**
 * Type declarations for the Interview Confirmation Emailer module.
 */

export interface InterviewConfirmationPayload {
    /** Full name of the candidate */
    name: string;
    /** Recipient email address */
    email: string;
    /** Scheduled interview date and time (ISO string or Date object) */
    time: string | Date;
    /** Clickable video conference URL (HTTP or HTTPS) */
    meetingLink: string;
}

export interface SendConfirmationResult {
    /** True if email was successfully dispatched to SMTP transporter */
    success: boolean;
    /** Recipient email address */
    recipient: string;
    /** Unique message identifier returned by nodemailer */
    messageId: string;
}

export interface ValidationResult {
    isValid: boolean;
    error?: string;
}

export interface EmailData {
    to: string;
    subject: string;
    message: string;
    text: string;
    html: string;
    formattedTime: string;
    meetingLink: string;
}

export interface EmailOptions {
    to: string;
    subject: string;
    message?: string;
    text?: string;
    html?: string;
    replyTo?: string;
}

/**
 * Validates, prepares, and immediately sends an interview confirmation email
 * to the candidate after they confirm their interview slot.
 *
 * @throws Error if input fails validation or SMTP delivery fails
 */
export function sendInterviewConfirmation(
    details: InterviewConfirmationPayload,
    customTransporter?: any
): Promise<SendConfirmationResult>;

/**
 * Prepares the confirmation email subject, text body, and HTML body without sending.
 * Useful for inspections, previews, and unit testing.
 */
export function prepareConfirmationEmail(
    details: InterviewConfirmationPayload
): EmailData | null;

/**
 * Formats an interview date/time string or Date object.
 */
export function formatInterviewTime(
    timeInput: string | Date | number
): string;

/**
 * Validates the candidate and interview details payload structure and types.
 */
export function validateInterviewDetails(
    details: any
): ValidationResult;

/**
 * Boolean validation check helper.
 */
export function isValidInterviewDetails(
    details: any
): boolean;

/**
 * Low-level email sender.
 */
export function sendEmail(
    email: EmailOptions,
    customTransporter?: any
): Promise<any>;

export function setTransporter(transporter: any): void;
export function getTransporter(): any;
export function resetTransporter(): void;
