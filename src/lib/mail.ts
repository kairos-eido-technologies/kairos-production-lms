import nodemailer from "nodemailer";
import "dotenv/config";
import dns from "dns";

const smtpHost = process.env.SMTP_HOST || "";
const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
const smtpUser = process.env.SMTP_USER || "";
const smtpPass = process.env.SMTP_PASS || "";
const smtpFrom = process.env.SMTP_FROM || '"iTech Academy" <verify@itechacademy.com>';

const isConfigured = !!(smtpHost && smtpUser && smtpPass);

let transporter: any = null;

if (isConfigured) {
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

// Custom CSS styles for premium red/black/white theme
const commonStyles = `
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background-color: #050505;
    color: #f4f4f5;
    margin: 0;
    padding: 0;
  }
  .container {
    max-width: 600px;
    margin: 40px auto;
    background-color: #0a0a0a;
    border: 1px solid #1a1a1a;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 20px 45px rgba(0, 0, 0, 0.8);
  }
  .header {
    background: linear-gradient(135deg, #e11d48 0%, #9f1239 100%);
    padding: 35px 20px;
    text-align: center;
    border-bottom: 2px solid #e11d48;
  }
  .logo {
    font-size: 24px;
    font-weight: 800;
    letter-spacing: -0.05em;
    color: #ffffff;
    margin: 0;
    text-transform: uppercase;
  }
  .content {
    padding: 40px 35px;
    text-align: left;
    background-color: #0c0c0e;
  }
  h1 {
    font-size: 24px;
    font-weight: 800;
    color: #ffffff;
    margin-top: 0;
    border-bottom: 1px solid #1a1a1a;
    padding-pb: 12px;
  }
  p {
    font-size: 15px;
    line-height: 1.6;
    color: #a1a1aa;
  }
  .card {
    background: #111113;
    border: 1px solid #222225;
    border-left: 4px solid #e11d48;
    padding: 20px;
    border-radius: 12px;
    margin: 24px 0;
  }
  .card-title {
    font-size: 18px;
    font-weight: 700;
    color: #ffffff;
    margin-top: 0;
    margin-bottom: 6px;
  }
  .card-desc {
    font-size: 14px;
    color: #a1a1aa;
    margin: 0;
  }
  .code-box {
    display: block;
    text-align: center;
    font-family: 'Courier New', Courier, monospace;
    font-size: 34px;
    font-weight: 800;
    letter-spacing: 8px;
    color: #ffffff;
    background: rgba(225, 29, 72, 0.1);
    border: 1px solid rgba(225, 29, 72, 0.35);
    padding: 18px 24px;
    border-radius: 12px;
    margin: 24px 0;
  }
  .btn-container {
    text-align: center;
    margin: 30px 0 10px 0;
  }
  .btn {
    display: inline-block;
    padding: 14px 30px;
    background-color: #e11d48;
    color: #ffffff !important;
    font-size: 15px;
    font-weight: 700;
    text-decoration: none;
    border-radius: 10px;
    box-shadow: 0 4px 14px rgba(225, 29, 72, 0.4);
    transition: all 0.2s ease;
  }
  .footer {
    background-color: #070708;
    padding: 25px;
    text-align: center;
    font-size: 11px;
    color: #52525b;
    border-top: 1px solid #141416;
  }
`;

/**
 * Sends email verification codes to students during signup.
 */
export async function sendVerificationEmail(
  toEmail: string,
  code: string,
  name: string
): Promise<{ success: boolean; mode: "smtp" | "console" }> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Verify your email — iTech Academy</title>
      <style>${commonStyles}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">iTech Academy</div>
        </div>
        <div class="content">
          <h1>Verify your email address</h1>
          <p>Hello ${name},</p>
          <p>Thank you for registering on iTech Academy. Please use the 6-digit verification code below to verify your email address and activate your learning account:</p>
          <div class="code-box">${code}</div>
          <p>This code will expire in 24 hours. If you did not register for this account, please ignore this email.</p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Kairos Eido Technologies. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  if (!isConfigured || !transporter) {
    logConsoleFallback("SMTP Verification Email", toEmail, name, `Verification Code: ${code}`);
    return { success: true, mode: "console" };
  }

  try {
    await transporter.sendMail({
      from: smtpFrom,
      to: toEmail,
      subject: "Verify your email — iTech Academy",
      text: `Hello ${name},\n\nYour iTech Academy email verification code is: ${code}\n\nUse this code to activate your account.`,
      html: htmlContent,
    });
    return { success: true, mode: "smtp" };
  } catch (error) {
    console.error("Error sending verification email via SMTP:", error);
    logConsoleFallback("SMTP Verification Email [RUNTIME ERROR - FALLBACK]", toEmail, name, `Verification Code: ${code}`);
    return { success: false, mode: "console" };
  }
}

/**
 * Sends a password reset verification code.
 */
export async function sendPasswordResetEmail(
  toEmail: string,
  code: string,
  name: string
): Promise<{ success: boolean; mode: "smtp" | "console" }> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Reset your password — iTech Academy</title>
      <style>${commonStyles}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">iTech Academy</div>
        </div>
        <div class="content">
          <h1>Reset Your Password</h1>
          <p>Hello ${name},</p>
          <p>We received a request to reset the password for your iTech Academy account. Please use the 6-digit password reset code below to proceed with resetting your password:</p>
          <div class="code-box">${code}</div>
          <p>This code will expire in 2 hours. If you did not request a password reset, please ignore this email.</p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Kairos Eido Technologies. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  if (!isConfigured || !transporter) {
    logConsoleFallback("SMTP Password Reset Email", toEmail, name, `Reset Code: \${code}`);
    return { success: true, mode: "console" };
  }

  try {
    await transporter.sendMail({
      from: smtpFrom,
      to: toEmail,
      subject: "Reset your password — iTech Academy",
      text: `Hello \${name},\n\nYour password reset code is: \${code}\n\nUse this code to reset your password.`,
      html: htmlContent,
    });
    return { success: true, mode: "smtp" };
  } catch (error) {
    console.error("Error sending password reset email via SMTP:", error);
    logConsoleFallback("SMTP Password Reset Email [RUNTIME ERROR - FALLBACK]", toEmail, name, `Reset Code: \${code}`);
    return { success: false, mode: "console" };
  }
}

/**
 * Sends a notification email to students when a course is assigned to them.
 */
export async function sendCourseAssignedEmail(
  toEmail: string,
  toName: string,
  courseName: string,
  courseCode: string
): Promise<{ success: boolean; mode: "smtp" | "console" }> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Course Assigned — iTech Academy</title>
      <style>${commonStyles}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">iTech Academy</div>
        </div>
        <div class="content">
          <h1>New Course Assigned</h1>
          <p>Hello ${toName},</p>
          <p>Good news! An instructor has assigned a new course for you. You can start learning immediately.</p>
          
          <div class="card">
            <div class="card-title">${courseName}</div>
            <div class="card-desc">Course Code: ${courseCode}</div>
          </div>

          <div class="btn-container">
            <a href="http://localhost:5173/login" class="btn">Access Your Courses</a>
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Kairos Eido Technologies. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  if (!isConfigured || !transporter) {
    logConsoleFallback("Course Assigned Email", toEmail, toName, `Course: ${courseName} (${courseCode})`);
    return { success: true, mode: "console" };
  }

  try {
    await transporter.sendMail({
      from: smtpFrom,
      to: toEmail,
      subject: `Course Assigned: ${courseName} — iTech Academy`,
      text: `Hello ${toName},\n\nA new course has been assigned for you: ${courseName} (${courseCode}).\n\nLog in at http://localhost:5173/login to access your materials.`,
      html: htmlContent,
    });
    return { success: true, mode: "smtp" };
  } catch (error) {
    console.error("Error sending course assigned email via SMTP:", error);
    logConsoleFallback("Course Assigned Email [RUNTIME ERROR - FALLBACK]", toEmail, toName, `Course: ${courseName} (${courseCode})`);
    return { success: false, mode: "console" };
  }
}

/**
 * Sends a nudge/miss-you email to idle students.
 */
export async function sendNudgeEmail(
  toEmail: string,
  toName: string,
  subject: string,
  messageBody: string
): Promise<{ success: boolean; mode: "smtp" | "console" }> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>We Miss You — iTech Academy</title>
      <style>${commonStyles}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">iTech Academy</div>
        </div>
        <div class="content">
          <h1>We Miss You! 👋</h1>
          <p>Hello ${toName},</p>
          <p>We noticed you haven't logged in recently. Here is a message from the administrator:</p>
          
          <div class="card">
            <p style="color: #ffffff; font-style: italic; margin: 0; font-size: 14.5px;">"${messageBody}"</p>
          </div>

          <div class="btn-container">
            <a href="http://localhost:5173/login" class="btn">Return to Portal</a>
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Kairos Eido Technologies. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  if (!isConfigured || !transporter) {
    logConsoleFallback("Idle Nudge Email", toEmail, toName, `Message: "${messageBody}"`);
    return { success: true, mode: "console" };
  }

  try {
    await transporter.sendMail({
      from: smtpFrom,
      to: toEmail,
      subject: `${subject} — iTech Academy`,
      text: `Hello ${toName},\n\nWe miss you at iTech Academy!\n\nMessage: "${messageBody}"\n\nReturn to your dashboard at http://localhost:5173/login`,
      html: htmlContent,
    });
    return { success: true, mode: "smtp" };
  } catch (error) {
    console.error("Error sending nudge email via SMTP:", error);
    logConsoleFallback("Idle Nudge Email [RUNTIME ERROR - FALLBACK]", toEmail, toName, `Message: "${messageBody}"`);
    return { success: false, mode: "console" };
  }
}

/**
 * Sends a notification email to teachers when a course is assigned to them.
 */
export async function sendTeacherCourseAssignedEmail(
  toEmail: string,
  toName: string,
  courseName: string,
  courseCode: string
): Promise<{ success: boolean; mode: "smtp" | "console" }> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Teaching Assignment — iTech Academy</title>
      <style>${commonStyles}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">iTech Academy</div>
        </div>
        <div class="content">
          <h1>New Teaching Assignment</h1>
          <p>Hello Instructor ${toName},</p>
          <p>You have been assigned as the primary instructor for the following course. You can now build sections, add content items, create assessments, and manage enrollments.</p>
          
          <div class="card">
            <div class="card-title">${courseName}</div>
            <div class="card-desc">Course Code: ${courseCode}</div>
          </div>

          <div class="btn-container">
            <a href="http://localhost:5173/login" class="btn">Go to Teacher Portal</a>
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Kairos Eido Technologies. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  if (!isConfigured || !transporter) {
    logConsoleFallback("Teacher Course Assigned Email", toEmail, toName, `Course: ${courseName} (${courseCode})`);
    return { success: true, mode: "console" };
  }

  try {
    await transporter.sendMail({
      from: smtpFrom,
      to: toEmail,
      subject: `Teaching Assignment: ${courseName} — iTech Academy`,
      text: `Hello ${toName},\n\nYou have been assigned to teach: ${courseName} (${courseCode}).\n\nLog in at http://localhost:5173/login to manage your class.`,
      html: htmlContent,
    });
    return { success: true, mode: "smtp" };
  } catch (error) {
    console.error("Error sending teacher course assigned email via SMTP:", error);
    logConsoleFallback("Teacher Course Assigned Email [RUNTIME ERROR - FALLBACK]", toEmail, toName, `Course: ${courseName} (${courseCode})`);
    return { success: false, mode: "console" };
  }
}

/**
 * Sends a notification email to teachers when a student submits an assessment.
 */
export async function sendNewSubmissionEmail(
  toEmail: string,
  toName: string,
  studentName: string,
  assessmentTitle: string,
  courseName: string
): Promise<{ success: boolean; mode: "smtp" | "console" }> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Quiz Submission — iTech Academy</title>
      <style>${commonStyles}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">iTech Academy</div>
        </div>
        <div class="content">
          <h1>New Quiz Submission</h1>
          <p>Hello ${toName},</p>
          <p>A student has submitted an assessment that may require grading or review.</p>
          
          <div class="card">
            <div class="card-title">${assessmentTitle}</div>
            <div class="card-desc">Submitted by: ${studentName} (${courseName})</div>
          </div>

          <div class="btn-container">
            <a href="http://localhost:5173/login" class="btn">Open Grading Panel</a>
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Kairos Eido Technologies. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  if (!isConfigured || !transporter) {
    logConsoleFallback("New Submission Email", toEmail, toName, `Student: ${studentName}, Quiz: ${assessmentTitle}`);
    return { success: true, mode: "console" };
  }

  try {
    await transporter.sendMail({
      from: smtpFrom,
      to: toEmail,
      subject: `New Quiz Submission: ${studentName} — iTech Academy`,
      text: `Hello ${toName},\n\nA student (${studentName}) has submitted ${assessmentTitle}.\n\nLog in at http://localhost:5173/login to grade.`,
      html: htmlContent,
    });
    return { success: true, mode: "smtp" };
  } catch (error) {
    console.error("Error sending new submission email via SMTP:", error);
    logConsoleFallback("New Submission Email [RUNTIME ERROR - FALLBACK]", toEmail, toName, `Student: ${studentName}, Quiz: ${assessmentTitle}`);
    return { success: false, mode: "console" };
  }
}

/**
 * Sends a notification email to students when their submission is graded.
 */
export async function sendSubmissionGradedEmail(
  toEmail: string,
  toName: string,
  assessmentTitle: string,
  score: number,
  maxScore: number
): Promise<{ success: boolean; mode: "smtp" | "console" }> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Quiz Graded — iTech Academy</title>
      <style>${commonStyles}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">iTech Academy</div>
        </div>
        <div class="content">
          <h1>Your Quiz Has Been Graded</h1>
          <p>Hello ${toName},</p>
          <p>Your submission has been reviewed by your instructor.</p>
          
          <div class="card">
            <div class="card-title">${assessmentTitle}</div>
            <div class="card-desc">Score: <strong>${score} / ${maxScore} points</strong> (${Math.round((score / (maxScore || 1)) * 100)}%)</div>
          </div>

          <div class="btn-container">
            <a href="http://localhost:5173/login" class="btn">View Quiz Details</a>
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Kairos Eido Technologies. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  if (!isConfigured || !transporter) {
    logConsoleFallback("Quiz Graded Email", toEmail, toName, `Quiz: ${assessmentTitle}, Score: ${score}/${maxScore}`);
    return { success: true, mode: "console" };
  }

  try {
    await transporter.sendMail({
      from: smtpFrom,
      to: toEmail,
      subject: `Quiz Graded: ${assessmentTitle} — iTech Academy`,
      text: `Hello ${toName},\n\nYour quiz "${assessmentTitle}" has been graded: ${score}/${maxScore}.\n\nLog in at http://localhost:5173/login to review.`,
      html: htmlContent,
    });
    return { success: true, mode: "smtp" };
  } catch (error) {
    console.error("Error sending quiz graded email via SMTP:", error);
    logConsoleFallback("Quiz Graded Email [RUNTIME ERROR - FALLBACK]", toEmail, toName, `Quiz: ${assessmentTitle}, Score: ${score}/${maxScore}`);
    return { success: false, mode: "console" };
  }
}

/**
 * Sends a notification email to teachers/admins when a certificate is requested.
 */
export async function sendCertificateRequestedEmail(
  toEmail: string,
  toName: string,
  studentName: string,
  courseName: string
): Promise<{ success: boolean; mode: "smtp" | "console" }> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Certificate Request — iTech Academy</title>
      <style>${commonStyles}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">iTech Academy</div>
        </div>
        <div class="content">
          <h1>New Certificate Request</h1>
          <p>Hello ${toName},</p>
          <p>A student has successfully completed the final exam and requested their course certificate.</p>
          
          <div class="card">
            <div class="card-title">${courseName}</div>
            <div class="card-desc">Requested by: ${studentName}</div>
          </div>

          <div class="btn-container">
            <a href="http://localhost:5173/login" class="btn">Review Certificate Requests</a>
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Kairos Eido Technologies. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  if (!isConfigured || !transporter) {
    logConsoleFallback("Certificate Requested Email", toEmail, toName, `Student: ${studentName}, Course: ${courseName}`);
    return { success: true, mode: "console" };
  }

  try {
    await transporter.sendMail({
      from: smtpFrom,
      to: toEmail,
      subject: `New Certificate Request: ${studentName} — iTech Academy`,
      text: `Hello ${toName},\n\n${studentName} has requested a certificate for "${courseName}".\n\nLog in at http://localhost:5173/login to review.`,
      html: htmlContent,
    });
    return { success: true, mode: "smtp" };
  } catch (error) {
    console.error("Error sending certificate request email via SMTP:", error);
    logConsoleFallback("Certificate Requested Email [RUNTIME ERROR - FALLBACK]", toEmail, toName, `Student: ${studentName}, Course: ${courseName}`);
    return { success: false, mode: "console" };
  }
}

/**
 * Sends a confirmation email to students when their certificate is approved.
 */
export async function sendCertificateApprovedEmail(
  toEmail: string,
  toName: string,
  courseName: string
): Promise<{ success: boolean; mode: "smtp" | "console" }> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Certificate Approved! 🎉 — iTech Academy</title>
      <style>${commonStyles}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">iTech Academy</div>
        </div>
        <div class="content">
          <h1>Congratulations! 🎉</h1>
          <p>Hello ${toName},</p>
          <p>Outstanding job! Your certificate of completion has been approved by your instructor.</p>
          
          <div class="card">
            <div class="card-title">${courseName}</div>
            <div class="card-desc">Your official certificate is ready for download.</div>
          </div>

          <div class="btn-container">
            <a href="http://localhost:5173/login" class="btn">Download Certificate</a>
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Kairos Eido Technologies. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  if (!isConfigured || !transporter) {
    logConsoleFallback("Certificate Approved Email", toEmail, toName, `Course: ${courseName}`);
    return { success: true, mode: "console" };
  }

  try {
    await transporter.sendMail({
      from: smtpFrom,
      to: toEmail,
      subject: `Certificate Approved: ${courseName}! 🎉 — iTech Academy`,
      text: `Hello ${toName},\n\nCongratulations! Your certificate of completion for "${courseName}" has been approved.\n\nLog in at http://localhost:5173/login to download it.`,
      html: htmlContent,
    });
    return { success: true, mode: "smtp" };
  } catch (error) {
    console.error("Error sending certificate approved email via SMTP:", error);
    logConsoleFallback("Certificate Approved Email [RUNTIME ERROR - FALLBACK]", toEmail, toName, `Course: ${courseName}`);
    return { success: false, mode: "console" };
  }
}

/**
 * Sends a notification email to students when their certificate is declined.
 */
export async function sendCertificateRejectedEmail(
  toEmail: string,
  toName: string,
  courseName: string,
  reason: string
): Promise<{ success: boolean; mode: "smtp" | "console" }> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Certificate Request Update — iTech Academy</title>
      <style>${commonStyles}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">iTech Academy</div>
        </div>
        <div class="content">
          <h1>Certificate Request Update</h1>
          <p>Hello ${toName},</p>
          <p>We are writing to inform you that your certificate request for the following course has been declined:</p>
          
          <div class="card">
            <div class="card-title">${courseName}</div>
            <div class="card-desc">Reason: <strong>${reason}</strong></div>
          </div>

          <p>If you believe this is an error, please reach out to your course instructor to discuss further action.</p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Kairos Eido Technologies. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  if (!isConfigured || !transporter) {
    logConsoleFallback("Certificate Rejected Email", toEmail, toName, `Course: ${courseName}, Reason: ${reason}`);
    return { success: true, mode: "console" };
  }

  try {
    await transporter.sendMail({
      from: smtpFrom,
      to: toEmail,
      subject: `Certificate Request Update: ${courseName} — iTech Academy`,
      text: `Hello ${toName},\n\nYour certificate request for "${courseName}" was declined.\n\nReason: ${reason}`,
      html: htmlContent,
    });
    return { success: true, mode: "smtp" };
  } catch (error) {
    console.error("Error sending certificate rejected email via SMTP:", error);
    logConsoleFallback("Certificate Rejected Email [RUNTIME ERROR - FALLBACK]", toEmail, toName, `Course: ${courseName}, Reason: ${reason}`);
    return { success: false, mode: "console" };
  }
}

/**
 * Sends a notification email when a user receives a new message.
 */
export async function sendMessageNotificationEmail(
  toEmail: string,
  toName: string,
  senderName: string,
  subject: string,
  body: string
): Promise<{ success: boolean; mode: "smtp" | "console" }> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Message — iTech Academy</title>
      <style>${commonStyles}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">iTech Academy</div>
        </div>
        <div class="content">
          <h1>New Message Received</h1>
          <p>Hello ${toName},</p>
          <p>You have received a new message from <strong>${senderName}</strong>:</p>
          
          <div class="card">
            <div class="card-title">${subject}</div>
            <p style="color: #ffffff; font-style: italic; margin: 0; font-size: 14.5px;">"${body}"</p>
          </div>

          <div class="btn-container">
            <a href="http://localhost:5173/login" class="btn">View Message</a>
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Kairos Eido Technologies. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  if (!isConfigured || !transporter) {
    logConsoleFallback("New Message Email", toEmail, toName, `From: ${senderName}, Subject: ${subject}`);
    return { success: true, mode: "console" };
  }

  try {
    await transporter.sendMail({
      from: smtpFrom,
      to: toEmail,
      subject: `New Message from ${senderName}: ${subject} — iTech Academy`,
      text: `Hello ${toName},\n\nYou received a new message from ${senderName}.\n\nSubject: ${subject}\n\nMessage: "${body}"\n\nLog in at http://localhost:5173/login to reply.`,
      html: htmlContent,
    });
    return { success: true, mode: "smtp" };
  } catch (error) {
    console.error("Error sending message notification email via SMTP:", error);
    logConsoleFallback("New Message Email [RUNTIME ERROR - FALLBACK]", toEmail, toName, `From: ${senderName}, Subject: ${subject}`);
    return { success: false, mode: "console" };
  }
}

/**
 * Sends a notification email to students when a course announcement is posted.
 */
export async function sendAnnouncementEmail(
  toEmail: string,
  toName: string,
  courseName: string,
  announcementTitle: string,
  announcementBody: string
): Promise<{ success: boolean; mode: "smtp" | "console" }> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Announcement — ${courseName}</title>
      <style>${commonStyles}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">iTech Academy</div>
        </div>
        <div class="content">
          <h1>New Announcement for ${courseName}</h1>
          <p>Hello ${toName},</p>
          <p>Your instructor has posted a new announcement:</p>
          
          <div class="card">
            <div class="card-title">${announcementTitle}</div>
            <p style="color: #ffffff; margin: 0; font-size: 14px; line-height: 1.5;">${announcementBody}</p>
          </div>

          <div class="btn-container">
            <a href="http://localhost:5173/login" class="btn">View Course Page</a>
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Kairos Eido Technologies. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  if (!isConfigured || !transporter) {
    logConsoleFallback("Course Announcement Email", toEmail, toName, `Course: ${courseName}, Title: ${announcementTitle}`);
    return { success: true, mode: "console" };
  }

  try {
    await transporter.sendMail({
      from: smtpFrom,
      to: toEmail,
      subject: `New Announcement: ${announcementTitle} [${courseName}]`,
      text: `Hello ${toName},\n\nA new announcement has been posted for ${courseName}:\n\n${announcementTitle}\n\n"${announcementBody}"\n\nLog in at http://localhost:5173/login to view.`,
      html: htmlContent,
    });
    return { success: true, mode: "smtp" };
  } catch (error) {
    console.error("Error sending announcement email via SMTP:", error);
    logConsoleFallback("Course Announcement Email [RUNTIME ERROR - FALLBACK]", toEmail, toName, `Course: ${courseName}, Title: ${announcementTitle}`);
    return { success: false, mode: "console" };
  }
}

/**
 * Sends a notification email to students when a course event is added to the calendar.
 */
export async function sendCalendarEventEmail(
  toEmail: string,
  toName: string,
  courseName: string,
  eventTitle: string,
  eventDescription: string,
  eventDate: string
): Promise<{ success: boolean; mode: "smtp" | "console" }> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Calendar Event — ${eventTitle}</title>
      <style>${commonStyles}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">iTech Academy</div>
        </div>
        <div class="content">
          <h1>New Calendar Event Added</h1>
          <p>Hello ${toName},</p>
          <p>A new event has been added to your calendar for <strong>${courseName}</strong>:</p>
          
          <div class="card">
            <div class="card-title">${eventTitle}</div>
            <div class="card-desc" style="margin-bottom: 10px;">Date & Time: <strong>${eventDate}</strong></div>
            <p style="color: #ffffff; margin: 0; font-size: 14px; line-height: 1.5;">${eventDescription}</p>
          </div>

          <div class="btn-container">
            <a href="http://localhost:5173/login" class="btn">View Calendar</a>
          </div>
        </div>
        <div class="footer">
          &copy; \${new Date().getFullYear()} Kairos Eido Technologies. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  if (!isConfigured || !transporter) {
    logConsoleFallback("Calendar Event Email", toEmail, toName, `Course: ${courseName}, Title: ${eventTitle}, Date: ${eventDate}`);
    return { success: true, mode: "console" };
  }

  try {
    await transporter.sendMail({
      from: smtpFrom,
      to: toEmail,
      subject: `New Event: ${eventTitle} [${courseName}]`,
      text: `Hello ${toName},\n\nA new calendar event has been added for ${courseName}:\n\nEvent: ${eventTitle}\nDate & Time: ${eventDate}\nDescription: "${eventDescription}"\n\nLog in at http://localhost:5173/login to view your calendar.`,
      html: htmlContent,
    });
    return { success: true, mode: "smtp" };
  } catch (error) {
    console.error("Error sending calendar event email via SMTP:", error);
    logConsoleFallback("Calendar Event Email [RUNTIME ERROR - FALLBACK]", toEmail, toName, `Course: ${courseName}, Title: ${eventTitle}`);
    return { success: false, mode: "console" };
  }
}

function logConsoleFallback(type: string, toEmail: string, name: string, detail: string) {
  console.log("\n" + "=".repeat(60));
  console.log(`[DEVELOPER WARNING] ${type.toUpperCase()}`);
  console.log(`To: ${toEmail} (${name})`);
  console.log(detail);
  console.log("=".repeat(60) + "\n");
}

/**
 * Sends a complete test suite of all 13 email templates to a given recipient email.
 */
export async function sendAllTestEmails(toEmail: string = "rhemanthjeyanezsingh@karunya.edu.in") {
  const recipientName = "Rhemanth Jeyanez";
  const results = [];

  results.push(await sendVerificationEmail(toEmail, "849201", recipientName));
  results.push(await sendPasswordResetEmail(toEmail, "491028", recipientName));
  results.push(await sendCourseAssignedEmail(toEmail, recipientName, "Full-Stack Web Development Mastery", "CS-401"));
  results.push(await sendNudgeEmail(toEmail, recipientName, "We miss you at iTech Academy!", "Don't forget to complete Module 4 of Full-Stack Web Development. You're almost at 80% completion!"));
  results.push(await sendTeacherCourseAssignedEmail(toEmail, recipientName, "Advanced React & Next.js Systems", "CS-502"));
  results.push(await sendNewSubmissionEmail(toEmail, recipientName, "Alex Rivers", "Midterm Assessment: Microservices", "CS-401"));
  results.push(await sendSubmissionGradedEmail(toEmail, recipientName, "Midterm Assessment: Microservices", 95, 100));
  results.push(await sendCertificateRequestedEmail(toEmail, recipientName, "Alex Rivers", "Full-Stack Web Development Mastery"));
  results.push(await sendCertificateApprovedEmail(toEmail, recipientName, "Full-Stack Web Development Mastery"));
  results.push(await sendCertificateRejectedEmail(toEmail, recipientName, "Full-Stack Web Development Mastery", "Please resubmit final capstone project repository URL."));
  results.push(await sendMessageNotificationEmail(toEmail, recipientName, "Dr. Sarah Jenkins", "Office Hours Schedule Update", "Hi Rhemanth, tomorrow's office hours have been moved to 3 PM EST. See you in the portal!"));
  results.push(await sendAnnouncementEmail(toEmail, recipientName, "Full-Stack Web Development Mastery", "New Lecture & Code Repository Added", "Check out Section 5 for the latest code samples and video walkthroughs. Happy coding!"));
  results.push(await sendCalendarEventEmail(toEmail, recipientName, "Full-Stack Web Development Mastery", "Live Q&A Webinar with Tech Leads", "Friday, 4:00 PM EST", "Join our senior engineers for a live code review and Q&A session. Link is available in the course dashboard."));

  return results;
}

