/**
 * ============================================================================
 * Interview Confirmation Emailer - Deliverability Batch Tester
 * ============================================================================
 *
 * PURPOSE:
 *   This script is intended for manual, controlled testing of real interview
 *   confirmation email delivery across a small set of developer test recipients.
 *   It allows inspecting formatting, meeting links, and inbox placement.
 *   It is NOT intended for bulk marketing, mass messaging, or spam-limit evasion.
 *
 * ⚠️ WARNING:
 *   Running this script CAN SEND REAL EMAILS.
 *
 * HOW TO USE:
 *   1. Edit the `candidates` array below with your test recipient addresses.
 *   2. Ensure `.env` at the project root contains your email credentials:
 *        EMAIL_USER=your_email@gmail.com
 *        EMAIL_APP_PASSWORD=your_16_char_app_password
 *   3. Run the script from the project root:
 *        node emailer/batchTest.js
 *   4. Review the candidate preview and type "SEND" when prompted to proceed.
 * ============================================================================
 */

// 1. EDITABLE CANDIDATES LIST
// Populate with developer test email addresses before running
const candidates = [
  {
    name: "Test Candidate 1",
    email: "", // Fill in manually (e.g. "test1@example.com")
    time: "2026-10-25T15:00:00+05:30",
    meetingLink: "https://meet.example.com/interview"
  },
  {
    name: "Test Candidate 2",
    email: "", // Fill in manually (e.g. "test2@example.com")
    time: "2026-10-25T16:00:00+05:30",
    meetingLink: "https://meet.example.com/interview"
  }
];

// 2. CONFIGURABLE BATCHING & DELAY SETTINGS
const BATCH_SIZE = 2; // Number of emails per batch
const DELAY_BETWEEN_EMAILS_MS = 1500; // Delay between consecutive sends in a batch (ms)
const DELAY_BETWEEN_BATCHES_MS = 3000; // Delay between batches (ms)

// Load environment configuration
const path = require("path");
require("dotenv").config();
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const readline = require("readline");
const { sendInterviewConfirmation } = require("./index");

/**
 * Helper delay function.
 * @param {number} ms
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Prompts user for input in the terminal.
 * @param {string} query
 * @returns {Promise<string>}
 */
function askConfirmation(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Normalizes email address for duplicate checking.
 * @param {string} email
 * @returns {string}
 */
function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

/**
 * Main batch testing execution routine.
 */
async function runBatchTest() {
  console.log("\n==================================================");
  console.log("   Interview Confirmation - Deliverability Test");
  console.log("==================================================\n");

  console.log(`Batch Size:          ${BATCH_SIZE}`);
  console.log(`Delay Between Sends: ${DELAY_BETWEEN_EMAILS_MS}ms`);
  console.log(`Total Candidates:    ${candidates.length}\n`);

  const seenEmails = new Set();
  const queueToProcess = [];
  const skippedEmpty = [];
  const skippedDuplicates = [];

  // Filter candidates for empty emails and duplicates
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const candidateName = candidate?.name || `Candidate #${i + 1}`;
    const rawEmail = candidate?.email;

    // Check for empty or missing email
    if (!rawEmail || typeof rawEmail !== "string" || rawEmail.trim() === "") {
      console.log(`[SKIP] ${candidateName}: Email address is empty.`);
      skippedEmpty.push({
        name: candidateName,
        reason: "Empty or missing email"
      });
      continue;
    }

    const normalized = normalizeEmail(rawEmail);

    // Check for duplicate recipient in same run
    if (seenEmails.has(normalized)) {
      console.log(`[SKIP - DUPLICATE] ${candidateName} <${normalized}>: Already queued.`);
      skippedDuplicates.push({
        name: candidateName,
        email: normalized,
        reason: "Duplicate recipient"
      });
      continue;
    }

    seenEmails.add(normalized);
    queueToProcess.push({
      ...candidate,
      email: rawEmail.trim(),
      normalizedEmail: normalized
    });
  }

  // If no eligible candidates
  if (queueToProcess.length === 0) {
    console.log("\n⚠️  No eligible candidates to send emails to.");
    console.log("Please populate the `candidates` array in emailer/batchTest.js.\n");
    printSummary({
      successfulSends: [],
      failedSends: [],
      skippedEmpty,
      skippedDuplicates
    });
    return;
  }

  // Preview eligible candidates before confirmation
  console.log("\n--------------------------------------------------");
  console.log(`Eligible Queue (${queueToProcess.length} email(s) ready to send):`);
  queueToProcess.forEach((item, idx) => {
    console.log(`  ${idx + 1}. ${item.name} <${item.email}>`);
    console.log(`     Time: ${item.time}`);
    console.log(`     Link: ${item.meetingLink}`);
  });
  console.log("--------------------------------------------------\n");

  // Explicit confirmation gate
  console.log("⚠️  CONFIRMATION REQUIRED: This action will send REAL emails.");
  const confirmation = await askConfirmation('Type "SEND" to confirm and begin sending: ');

  if (confirmation !== "SEND") {
    console.log("\n❌ Confirmation not received. Cancelled without sending anything.\n");
    return;
  }

  console.log("\n🚀 Starting sequential delivery...\n");

  const successfulSends = [];
  const failedSends = [];

  // Split into batches
  const batches = [];
  for (let i = 0; i < queueToProcess.length; i += BATCH_SIZE) {
    batches.push(queueToProcess.slice(i, i + BATCH_SIZE));
  }

  for (let bIndex = 0; bIndex < batches.length; bIndex++) {
    const currentBatch = batches[bIndex];
    console.log(`--- Processing Batch ${bIndex + 1} of ${batches.length} (${currentBatch.length} recipient${currentBatch.length > 1 ? "s" : ""}) ---`);

    for (let cIndex = 0; cIndex < currentBatch.length; cIndex++) {
      const candidate = currentBatch[cIndex];

      console.log(`\nAttempting send:`);
      console.log(`  Name:           ${candidate.name}`);
      console.log(`  Recipient:      ${candidate.email}`);
      console.log(`  Interview Time: ${candidate.time}`);

      try {
        const result = await sendInterviewConfirmation({
          name: candidate.name,
          email: candidate.email,
          time: candidate.time,
          meetingLink: candidate.meetingLink
        });

        console.log(`  Result:         SUCCESS ✅`);
        console.log(`  Message ID:     ${result.messageId}`);

        successfulSends.push({
          name: candidate.name,
          email: candidate.email,
          time: candidate.time,
          messageId: result.messageId
        });
      } catch (error) {
        // Safe error logging without exposing credentials
        const safeError = error?.message ? error.message.replace(/pass=[^&\s]+/gi, "pass=***") : "Unknown error";
        console.error(`  Result:         FAILED ❌`);
        console.error(`  Error:          ${safeError}`);

        failedSends.push({
          name: candidate.name,
          email: candidate.email,
          time: candidate.time,
          error: safeError
        });
      }

      // Delay between emails in same batch
      const isLastInBatch = cIndex === currentBatch.length - 1;
      if (!isLastInBatch && DELAY_BETWEEN_EMAILS_MS > 0) {
        await sleep(DELAY_BETWEEN_EMAILS_MS);
      }
    }

    // Delay between consecutive batches
    const isLastBatch = bIndex === batches.length - 1;
    if (!isLastBatch && DELAY_BETWEEN_BATCHES_MS > 0) {
      console.log(`\nWaiting ${DELAY_BETWEEN_BATCHES_MS}ms before next batch...`);
      await sleep(DELAY_BETWEEN_BATCHES_MS);
    }
  }

  printSummary({
    successfulSends,
    failedSends,
    skippedEmpty,
    skippedDuplicates
  });
}

/**
 * Prints the final summary table.
 */
function printSummary({ successfulSends, failedSends, skippedEmpty, skippedDuplicates }) {
  console.log("\n==================================================");
  console.log("            BATCH TEST EXECUTION SUMMARY");
  console.log("==================================================");
  console.log(`Total Candidates Defined:      ${candidates.length}`);
  console.log(`Successful Sends:              ${successfulSends.length} ✅`);
  console.log(`Failed Sends:                  ${failedSends.length} ❌`);
  console.log(`Skipped (Empty/Missing Email): ${skippedEmpty.length} ⏭️`);
  console.log(`Duplicate Recipients Skipped:  ${skippedDuplicates.length} ⏭️`);
  console.log("==================================================");

  if (successfulSends.length > 0) {
    console.log("\nSuccessful Deliveries:");
    successfulSends.forEach((item, idx) => {
      console.log(`  ${idx + 1}. ${item.name} (${item.email}) - Message ID: ${item.messageId}`);
    });
  }

  if (failedSends.length > 0) {
    console.log("\nFailed Deliveries (not retried):");
    failedSends.forEach((item, idx) => {
      console.log(`  ${idx + 1}. ${item.name} (${item.email}) - Error: ${item.error}`);
    });
  }

  if (skippedEmpty.length > 0) {
    console.log("\nSkipped Candidates (Empty Email):");
    skippedEmpty.forEach((item, idx) => {
      console.log(`  ${idx + 1}. ${item.name}`);
    });
  }

  if (skippedDuplicates.length > 0) {
    console.log("\nSkipped Duplicate Recipients:");
    skippedDuplicates.forEach((item, idx) => {
      console.log(`  ${idx + 1}. ${item.name} (${item.email})`);
    });
  }

  console.log("\nDeliverability Inspection Tips:");
  console.log("  • Check recipient's Primary Inbox and Spam folder.");
  console.log("  • If in Spam, mark 'Report not spam' to train Gmail's filter.");
  console.log("  • Verify the meeting link is clickable and formatted correctly.");
  console.log("==================================================\n");
}

// Ensure execution only when invoked directly
if (require.main === module) {
  runBatchTest().catch((err) => {
    console.error("Fatal error during batch test:", err?.message || err);
    process.exit(1);
  });
}

module.exports = {
  candidates,
  BATCH_SIZE,
  DELAY_BETWEEN_EMAILS_MS,
  DELAY_BETWEEN_BATCHES_MS,
  normalizeEmail,
  runBatchTest
};
