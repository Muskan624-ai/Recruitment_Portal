# Recruitment Portal — Interview Confirmation Emailer Module (`emailer/`)

A dedicated, modular email service built with Node.js and Nodemailer for sending immediate interview confirmation emails to candidates upon reserving or confirming their interview slots.

---

## Table of Contents
1. [Module Architecture & Execution Flow](#module-architecture--execution-flow)
2. [How to Integrate This Module with the Database (Prisma)](#how-to-integrate-this-module-with-the-database-prisma)
   - [Candidate Slot Confirmation Controller Example](#candidate-slot-confirmation-controller-example)
   - [Error Handling & Reliability](#error-handling--reliability)
3. [File-by-File Execution Flow](#file-by-file-execution-flow)
4. [Date and Time Formatting Conventions](#date-and-time-formatting-conventions)
5. [Deliverability Batch Tester (`batchTest.js`)](#deliverability-batch-tester-batchtestjs)
   - [Purpose](#purpose)
   - [Safety Features](#safety-features)
   - [How to Use](#how-to-use)
6. [Environment Configuration](#environment-configuration)
7. [Running Automated Tests](#running-automated-tests)

---

## Module Architecture & Execution Flow

When the backend calls `sendInterviewConfirmation()`, execution proceeds deterministically through distinct, decoupled layers:

```mermaid
flowchart TD
    DB[(MongoDB / Prisma Database)] -->|1. Candidate Confirms Slot| Controller[Slot Booking Controller]
    Controller -->|2. sendInterviewConfirmation(payload)| Index[index.js / index.d.ts<br/>Public API Facade]
    
    Index -->|3. Validate Payload| Validation[validation.js<br/>validateInterviewDetails()]
    Validation -->|Throws Validation Error| ErrorHandler[Error Handler / Controller Catch]
    
    Validation -->|4. Valid Payload| Service[emailService.js<br/>prepareConfirmationEmail()]
    Service -->|Timezone-Aware Formatting| Formatter[formatInterviewTime()<br/>• Respects explicit offsets e.g. +05:30, Z<br/>• Defaults to IST project convention]
    Formatter -->|Build Content| Template[Generate Subject, Text & HTML<br/>• Subject: Interview Confirmation – Club Recruitment<br/>• Clickable Meeting Link & Instructions]
    
    Service -->|5. Dispatch Options| Mailer[mailer.js<br/>sendEmail()]
    Mailer -->|Read .env & Validate Config| Transporter[Nodemailer Gmail Transporter]
    Transporter -->|6. Immediate SMTP Dispatch| Gmail[Google SMTP Servers]
    Gmail -->|Message ID| Caller[Returns { success: true, recipient, messageId }]
```

---

## How to Integrate This Module with the Database (Prisma)

The module is exposed with full TypeScript type declarations via `emailer/index.d.ts` and CommonJS exports via `emailer/index.js`.

### Candidate Slot Confirmation Controller Example

When a candidate selects and books an interview slot in the candidate portal:

```typescript
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendInterviewConfirmation } from '../emailer'; // or require('./emailer') in CommonJS

const prisma = new PrismaClient();

export async function bookInterviewSlot(req: Request, res: Response) {
  try {
    const { slotId, userId } = req.body;

    // 1. Fetch the user and verify the slot in the database
    const user = await prisma.user.findUnique({
      where: { id: String(userId) }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    const slot = await prisma.slot.findUnique({
      where: { id: String(slotId) }
    });

    if (!slot) {
      return res.status(404).json({ success: false, message: 'Interview slot not found' });
    }

    // 2. Mark the slot as booked in the database
    const updatedSlot = await prisma.slot.update({
      where: { id: String(slotId) },
      data: {
        isBooked: true,
        candidateId: user.id
      }
    });

    // 3. Immediately send the interview confirmation email
    const emailResult = await sendInterviewConfirmation({
      name: user.name,
      email: user.email,
      time: slot.startTime, // Can be ISO string or native Date object
      meetingLink: slot.meetingLink || 'https://meet.google.com/xyz-recruitment'
    });

    console.log(`Confirmation email sent to ${emailResult.recipient} [Message ID: ${emailResult.messageId}]`);

    return res.status(200).json({
      success: true,
      message: 'Interview slot booked and confirmation email sent successfully',
      data: {
        slot: updatedSlot,
        emailDelivery: emailResult
      }
    });
  } catch (error: any) {
    console.error('Failed to book slot or send email:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during slot booking'
    });
  }
}
```

### Error Handling & Reliability

- **Synchronous immediate sending**: This module does not schedule or queue reminder emails; it sends immediately upon execution.
- **Failures bubble up**: If SMTP credentials are misconfigured or validation fails, an informative `Error` is thrown, allowing the calling controller to catch it, log it, or respond with appropriate HTTP status codes.

---

## File-by-File Execution Flow

| File | Purpose | Key Responsibilities |
| :--- | :--- | :--- |
| [`index.js`](./index.js) / [`index.d.ts`](./index.d.ts) | Public API Entry Point | Re-exports `sendInterviewConfirmation` and utilities with complete TypeScript type definitions. |
| [`validation.js`](./validation.js) | Input Validation | Validates `name` (non-empty string), `email` (RFC regex syntax), `time` (valid Date or parseable timestamp), and `meetingLink` (valid HTTP/HTTPS protocol URL). |
| [`emailService.js`](./emailService.js) | Content & Template Generation | Builds clean plain-text and responsive HTML email templates. Formats interview times with explicit timezone awareness. |
| [`mailer.js`](./mailer.js) | SMTP Transport & Security | Manages the Nodemailer Gmail transporter, loads `.env` variables securely, sanitizes sender headers, and provides mock hooks (`setTransporter`, `resetTransporter`). |
| [`emailer.test.js`](./emailer.test.js) | Unit & Integration Test Suite | 14 automated tests covering validation, templating, error isolation, configuration checks, and mocked SMTP transport. |
| [`batchTest.js`](./batchTest.js) | Manual Deliverability Staging Tool | Interactive CLI to safely send real confirmation test emails to verified developer mailboxes to inspect inbox placement. |

---

## Date and Time Formatting Conventions

The `formatInterviewTime()` helper handles candidate interview dates with care:

1. **Explicit Timezone Offset Preserved**:
   - If an ISO string has an explicit offset (e.g. `2026-10-25T15:00:00+05:30`), it formats directly to:
     `Sunday, October 25, 2026 at 3:00 PM (IST)` without shifting or converting to local host time.
   - If UTC `Z` is provided (e.g. `2026-10-25T10:00:00Z`), it outputs:
     `Sunday, October 25, 2026 at 10:00 AM (UTC)`.
2. **Documented Project Convention for Timezone-less Inputs**:
   - If a plain Date object or timezone-less string is provided, it consistently formats in the project standard timezone:
     **`Asia/Kolkata` (IST, UTC+05:30)**.

---

## Deliverability Batch Tester (`batchTest.js`)

### Purpose
Before linking the module to real applicant traffic, `batchTest.js` allows developers to manually test and inspect:
1. Real Gmail SMTP authentication using their Google App Password.
2. Responsive email layout rendering on mobile and desktop mail clients.
3. Meeting link clickability.
4. Deliverability and inbox placement (**Primary Inbox** vs. **Promotions** vs. **Spam**).

### Safety Features
- **Strict Confirmation Gate**: Requires typing `SEND` into the terminal before any real emails can be dispatched.
- **Empty Email Suppression**: Automatically skips entries with empty email fields.
- **Duplicate Prevention**: Normalizes email addresses (trimmed and lowercased) and skips duplicate recipients within the same execution run.
- **Accidental Burst Throttling**: Dispatches in configurable small batches (`BATCH_SIZE`) with delays (`DELAY_BETWEEN_EMAILS_MS`) to avoid triggering Gmail rate limits.
- **Credential Protection**: Never outputs passwords or secrets in console logs or error reports.
- **Isolated Failure Handling**: Catches delivery errors per recipient without aborting the rest of the queue.

### How to Use
1. Open [`emailer/batchTest.js`](./batchTest.js) and populate the `candidates` array:
   ```javascript
   const candidates = [
     {
       name: "Test Candidate 1",
       email: "your_test_email@example.com",
       time: "2026-10-25T15:00:00+05:30",
       meetingLink: "https://meet.google.com/abc-defg-hij"
     }
   ];
   ```
2. Run from the project root:
   ```bash
   node emailer/batchTest.js
   ```
3. Type `SEND` when prompted.
4. Inspect the summary report and check your recipient mailboxes.

---

## Environment Configuration

Loaded automatically from `.env` in the project root:

```env
# Gmail account address
EMAIL_USER=your_club_email@gmail.com

# 16-character Google App Password (from Google Account Security -> App Passwords)
EMAIL_APP_PASSWORD=your_16_char_app_password

# Optional: Custom display name for From header
EMAIL_FROM="Club Recruitment Team <your_club_email@gmail.com>"

# Optional: Dedicated reply-to address
EMAIL_REPLY_TO=your_club_email@gmail.com
```

---

## Running Automated Tests

Run the built-in Node.js test runner suite:

```bash
node --test emailer/emailer.test.js
```

This runs all 14 tests in [`emailer/emailer.test.js`](./emailer.test.js). Transporters are mocked so **no live network emails are sent**.
