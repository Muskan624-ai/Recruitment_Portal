/**
 * Recruitment Portal - Interview Confirmation Emailer
 * Validation module for interview confirmation details.
 */

/**
 * Validates candidate and interview details before sending confirmation email.
 *
 * Required fields:
 * - name: non-empty string
 * - email: valid email address format
 * - time: valid date, timestamp, or parseable ISO date string
 * - meetingLink: valid HTTP or HTTPS URL
 *
 * @param {any} details
 * @returns {{ isValid: boolean, error?: string }}
 */
function validateInterviewDetails(details) {
    if (!details || typeof details !== "object" || Array.isArray(details)) {
        return {
            isValid: false,
            error: "Interview details must be a non-null object."
        };
    }

    // 1. Name validation
    if (typeof details.name !== "string" || details.name.trim() === "") {
        return {
            isValid: false,
            error: "Field 'name' is required and must be a non-empty string."
        };
    }

    // 2. Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof details.email !== "string" || !emailRegex.test(details.email.trim())) {
        return {
            isValid: false,
            error: "Field 'email' is required and must be a valid email address."
        };
    }

    // 3. Time validation
    if (details.time === undefined || details.time === null || details.time === "") {
        return {
            isValid: false,
            error: "Field 'time' is required and must be a valid date or timestamp."
        };
    }

    const parsedDate = new Date(details.time);
    if (isNaN(parsedDate.getTime())) {
        return {
            isValid: false,
            error: "Field 'time' must be a valid date, ISO timestamp, or date string."
        };
    }

    // 4. Meeting link validation
    if (typeof details.meetingLink !== "string" || details.meetingLink.trim() === "") {
        return {
            isValid: false,
            error: "Field 'meetingLink' is required and must be a valid HTTP or HTTPS URL."
        };
    }

    const trimmedUrl = details.meetingLink.trim();
    try {
        const parsedUrl = new URL(trimmedUrl);
        if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
            return {
                isValid: false,
                error: "Field 'meetingLink' must use HTTP or HTTPS protocol."
            };
        }
    } catch {
        return {
            isValid: false,
            error: "Field 'meetingLink' must be a valid URL (e.g. https://meet.google.com/xyz)."
        };
    }

    return {
        isValid: true
    };
}

/**
 * Boolean validation helper.
 * @param {any} details
 * @returns {boolean}
 */
function isValidInterviewDetails(details) {
    return validateInterviewDetails(details).isValid;
}

module.exports = {
    validateInterviewDetails,
    isValidInterviewDetails
};
