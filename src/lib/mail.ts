function getMailTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const user = process.env.SMTP_USER || "kairoseidotechnologies@gmail.com";
  const pass = process.env.SMTP_PASS || "jnixkajeegoqzkuc";
  const from = process.env.SMTP_FROM || '"iTech Academy" <kairoseidotechnologies@gmail.com>';

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });

  return { transporter, from };
}

// Custom CSS styles for clean red/black/dark theme
const commonStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

  body {
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background-color: #09090b;
    color: #f4f4f5;
    margin: 0;
    padding: 20px 10px;
    -webkit-font-smoothing: antialiased;
  }
  .container {
    max-width: 600px;
    margin: 0 auto;
    background-color: #121215;
    border: 1px solid #27272a;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);
  }
  .header {
    background: linear-gradient(135deg, #09090b 0%, #1c050b 50%, #9f1239 100%);
    padding: 36px 30px;
    text-align: center;
    border-bottom: 2px solid rgba(225, 29, 72, 0.4);
  }
  .logo-img {
    height: 64px;
    width: 64px;
    border-radius: 50%;
    display: block;
    margin: 0 auto 12px auto;
    object-fit: cover;
    box-shadow: 0 8px 24px rgba(225, 29, 72, 0.4);
  }
  .logo-text {
    font-size: 24px;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: #ffffff;
    margin: 0;
    text-transform: uppercase;
  }
  .content {
    padding: 40px 35px;
    text-align: left;
    background-color: #121215;
  }
  h1 {
    font-size: 22px;
    font-weight: 800;
    color: #ffffff;
    margin-top: 0;
    margin-bottom: 16px;
    letter-spacing: -0.02em;
  }
  p {
    font-size: 15px;
    line-height: 1.7;
    color: #a1a1aa;
    margin-top: 0;
    margin-bottom: 18px;
  }
  .card {
    background: #18181c;
    border: 1px solid #27272a;
    border-left: 4px solid #e11d48;
    padding: 22px;
    border-radius: 14px;
    margin: 24px 0;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
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
  .badge {
    display: inline-block;
    padding: 4px 12px;
    background: rgba(225, 29, 72, 0.15);
    border: 1px solid rgba(225, 29, 72, 0.35);
    color: #fb7185;
    font-size: 12px;
    font-weight: 700;
    border-radius: 20px;
    margin-bottom: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .code-box {
    display: block;
    text-align: center;
    font-family: 'SF Mono', 'Courier New', Courier, monospace;
    font-size: 36px;
    font-weight: 800;
    letter-spacing: 12px;
    color: #ffffff;
    background: linear-gradient(135deg, rgba(225, 29, 72, 0.12) 0%, rgba(190, 18, 60, 0.18) 100%);
    border: 1px solid rgba(225, 29, 72, 0.4);
    padding: 20px 24px;
    border-radius: 14px;
    margin: 28px 0;
    box-shadow: 0 4px 20px rgba(225, 29, 72, 0.15);
  }
  .btn-container {
    text-align: center;
    margin: 32px 0 12px 0;
  }
  .btn {
    display: inline-block;
    padding: 14px 32px;
    background: linear-gradient(135deg, #e11d48 0%, #be123c 100%);
    color: #ffffff !important;
    font-size: 15px;
    font-weight: 700;
    text-decoration: none;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(225, 29, 72, 0.35);
  }
  .footer {
    background-color: #0c0c0e;
    padding: 24px 30px;
    text-align: center;
    font-size: 12px;
    color: #71717a;
    border-top: 1px solid #1c1c20;
    line-height: 1.6;
  }
`;

const logoHeader = `<div class="header"><img src="https://kairos-production-lms.vercel.app/logo.png" alt="iTech Academy Logo" class="logo-img" /><div class="logo-text">iTech Academy</div></div>`;

export async function sendVerificationEmail(
  toEmail: string,
  code: string,
  name: string
): Promise<{ success: boolean; mode: "smtp" | "console" }> {
  const htmlContent = `
    <!DOCTYPE html><html><head><meta charset="utf-8"><title>Verify Your Email — iTech Academy</title><style>${commonStyles}</style></head><body><div class="container">${logoHeader}<div class="content"><span class="badge">Security Verification</span><h1>Verify Your Email Address</h1><p>Hello ${name},</p><p>Thank you for creating an account on iTech Academy. Please enter the 6-digit activation code below to verify your email and unlock your learning portal:</p><div class="code-box">${code}</div><p style="font-size: 13px; color: #71717a;">This verification code will expire in 24 hours. If you did not sign up for an iTech Academy account, please ignore this email.</p></div><div class="footer">&copy; ${new Date().getFullYear()} iTech Academy. All rights reserved.</div></div></body></html>
  `;

  try {
    const { transporter, from } = getMailTransporter();
    await transporter.sendMail({
      from,
      to: toEmail,
      subject: "Verify your email — iTech Academy",
      text: `Hello ${name},\n\nYour iTech Academy email verification code is: ${code}\n\nUse this code to activate your account.`,
      html: htmlContent,
    });
    console.log(`✅ Verification email successfully sent to ${toEmail} (Code: ${code})`);
    return { success: true, mode: "smtp" };
  } catch (error) {
    console.error("❌ Error sending verification email via SMTP:", error);
    logConsoleFallback("SMTP Verification Email [RUNTIME ERROR - FALLBACK]", toEmail, name, `Verification Code: ${code}`);
    return { success: false, mode: "console" };
  }
}

export async function sendPasswordResetEmail(
  toEmail: string,
  code: string,
  name: string
): Promise<{ success: boolean; mode: "smtp" | "console" }> {
  const htmlContent = `
    <!DOCTYPE html><html><head><meta charset="utf-8"><title>Reset Your Password — iTech Academy</title><style>${commonStyles}</style></head><body><div class="container">${logoHeader}<div class="content"><span class="badge" style="background: rgba(239, 68, 68, 0.15); border-color: rgba(239, 68, 68, 0.35); color: #f87171;">Account Security</span><h1>Reset Your Password</h1><p>Hello ${name},</p><p>We received a request to reset the password for your iTech Academy account. Use the secure single-use passcode below to proceed:</p><div class="code-box">${code}</div><p style="font-size: 13px; color: #71717a;">This security code will expire in 2 hours. If you didn't request a password reset, your account is safe and you can safely ignore this email.</p></div><div class="footer">&copy; ${new Date().getFullYear()} iTech Academy. All rights reserved.</div></div></body></html>
  `;

  if (!isConfigured || !transporter) {
    logConsoleFallback("SMTP Password Reset Email", toEmail, name, `Reset Code: ${code}`);
    return { success: true, mode: "console" };
  }

  try {
    await transporter.sendMail({
      from: smtpFrom,
      to: toEmail,
      subject: "Reset your password — iTech Academy",
      text: `Hello ${name},\n\nYour password reset code is: ${code}\n\nUse this code to reset your password.`,
      html: htmlContent,
    });
    return { success: true, mode: "smtp" };
  } catch (error) {
    console.error("Error sending password reset email via SMTP:", error);
    logConsoleFallback("SMTP Password Reset Email [RUNTIME ERROR - FALLBACK]", toEmail, name, `Reset Code: ${code}`);
    return { success: false, mode: "console" };
  }
}

export async function sendCourseAssignedEmail(
  toEmail: string,
  toName: string,
  courseName: string,
  courseCode: string
): Promise<{ success: boolean; mode: "smtp" | "console" }> {
  const htmlContent = `
    <!DOCTYPE html><html><head><meta charset="utf-8"><title>Course Assigned — iTech Academy</title><style>${commonStyles}</style></head><body><div class="container">${logoHeader}<div class="content"><span class="badge" style="background: rgba(16, 185, 129, 0.15); border-color: rgba(16, 185, 129, 0.35); color: #34d399;">New Enrollment</span><h1>New Course Assigned 🎉</h1><p>Hello ${toName},</p><p>Great news! An instructor has assigned a new learning path to your student dashboard. You can begin accessing your course modules immediately:</p><div class="card"><div class="card-title">${courseName}</div><div class="card-desc">Course Code: <strong>${courseCode}</strong> &bull; Access: Lifetime Access</div></div><div class="btn-container"><a href="https://kairos-production-lms.vercel.app/login" class="btn">Launch Course Dashboard</a></div></div><div class="footer">&copy; ${new Date().getFullYear()} iTech Academy. All rights reserved.</div></div></body></html>
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
      text: `Hello ${toName},\n\nA new course has been assigned for you: ${courseName} (${courseCode}).\n\nLog in at https://kairos-production-lms.vercel.app/login to access your materials.`,
      html: htmlContent,
    });
    return { success: true, mode: "smtp" };
  } catch (error) {
    console.error("Error sending course assigned email via SMTP:", error);
    logConsoleFallback("Course Assigned Email [RUNTIME ERROR - FALLBACK]", toEmail, toName, `Course: ${courseName} (${courseCode})`);
    return { success: false, mode: "console" };
  }
}

export async function sendNudgeEmail(
  toEmail: string,
  toName: string,
  subject: string,
  messageBody: string
): Promise<{ success: boolean; mode: "smtp" | "console" }> {
  const htmlContent = `
    <!DOCTYPE html><html><head><meta charset="utf-8"><title>We Miss You — iTech Academy</title><style>${commonStyles}</style></head><body><div class="container">${logoHeader}<div class="content"><span class="badge" style="background: rgba(245, 158, 11, 0.15); border-color: rgba(245, 158, 11, 0.35); color: #fbbf24;">Progress Reminder</span><h1>We Miss You! 👋</h1><p>Hello ${toName},</p><p>We noticed you haven't logged in recently. Here is a personal message from your academic manager:</p><div class="card" style="border-left-color: #f59e0b;"><p style="color: #ffffff; font-style: italic; margin: 0; font-size: 15px; line-height: 1.6;">"${messageBody}"</p></div><div class="btn-container"><a href="https://kairos-production-lms.vercel.app/login" class="btn">Resume Learning</a></div></div><div class="footer">&copy; ${new Date().getFullYear()} iTech Academy. All rights reserved.</div></div></body></html>
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
      text: `Hello ${toName},\n\nWe miss you at iTech Academy!\n\nMessage: "${messageBody}"\n\nReturn to your dashboard at https://kairos-production-lms.vercel.app/login`,
      html: htmlContent,
    });
    return { success: true, mode: "smtp" };
  } catch (error) {
    console.error("Error sending nudge email via SMTP:", error);
    logConsoleFallback("Idle Nudge Email [RUNTIME ERROR - FALLBACK]", toEmail, toName, `Message: "${messageBody}"`);
    return { success: false, mode: "console" };
  }
}

export async function sendTeacherCourseAssignedEmail(
  toEmail: string,
  toName: string,
  courseName: string,
  courseCode: string
): Promise<{ success: boolean; mode: "smtp" | "console" }> {
  const htmlContent = `
    <!DOCTYPE html><html><head><meta charset="utf-8"><title>Teaching Assignment — iTech Academy</title><style>${commonStyles}</style></head><body><div class="container">${logoHeader}<div class="content"><span class="badge">Faculty Assignment</span><h1>New Teaching Assignment</h1><p>Hello Instructor ${toName},</p><p>You have been assigned as the primary instructor for the following course module. You now have full permission to build syllabus sections, upload labs, create quizzes, and evaluate student submissions:</p><div class="card"><div class="card-title">${courseName}</div><div class="card-desc">Course Code: <strong>${courseCode}</strong> &bull; Status: Active</div></div><div class="btn-container"><a href="https://kairos-production-lms.vercel.app/login" class="btn">Open Teacher Portal</a></div></div><div class="footer">&copy; ${new Date().getFullYear()} iTech Academy. All rights reserved.</div></div></body></html>
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
      text: `Hello ${toName},\n\nYou have been assigned to teach: ${courseName} (${courseCode}).\n\nLog in at https://kairos-production-lms.vercel.app/login to manage your class.`,
      html: htmlContent,
    });
    return { success: true, mode: "smtp" };
  } catch (error) {
    console.error("Error sending teacher course assigned email via SMTP:", error);
    logConsoleFallback("Teacher Course Assigned Email [RUNTIME ERROR - FALLBACK]", toEmail, toName, `Course: ${courseName} (${courseCode})`);
    return { success: false, mode: "console" };
  }
}

export async function sendNewSubmissionEmail(
  toEmail: string,
  toName: string,
  studentName: string,
  assessmentTitle: string,
  courseName: string
): Promise<{ success: boolean; mode: "smtp" | "console" }> {
  const htmlContent = `
    <!DOCTYPE html><html><head><meta charset="utf-8"><title>New Quiz Submission — iTech Academy</title><style>${commonStyles}</style></head><body><div class="container">${logoHeader}<div class="content"><span class="badge" style="background: rgba(59, 130, 246, 0.15); border-color: rgba(59, 130, 246, 0.35); color: #60a5fa;">Grading Alert</span><h1>New Quiz Submission Received</h1><p>Hello ${toName},</p><p>A student has completed an assessment and submitted their responses for instructor review:</p><div class="card" style="border-left-color: #3b82f6;"><div class="card-title">${assessmentTitle}</div><div class="card-desc">Submitted by: <strong>${studentName}</strong> &bull; Course: ${courseName}</div></div><div class="btn-container"><a href="https://kairos-production-lms.vercel.app/login" class="btn" style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); box-shadow: 0 8px 24px rgba(37, 99, 235, 0.35);">Open Grading Panel</a></div></div><div class="footer">&copy; ${new Date().getFullYear()} iTech Academy. All rights reserved.</div></div></body></html>
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
      text: `Hello ${toName},\n\nA student (${studentName}) has submitted ${assessmentTitle}.\n\nLog in at https://kairos-production-lms.vercel.app/login to grade.`,
      html: htmlContent,
    });
    return { success: true, mode: "smtp" };
  } catch (error) {
    console.error("Error sending new submission email via SMTP:", error);
    logConsoleFallback("New Submission Email [RUNTIME ERROR - FALLBACK]", toEmail, toName, `Student: ${studentName}, Quiz: ${assessmentTitle}`);
    return { success: false, mode: "console" };
  }
}

export async function sendSubmissionGradedEmail(
  toEmail: string,
  toName: string,
  assessmentTitle: string,
  score: number,
  maxScore: number
): Promise<{ success: boolean; mode: "smtp" | "console" }> {
  const htmlContent = `
    <!DOCTYPE html><html><head><meta charset="utf-8"><title>Quiz Graded — iTech Academy</title><style>${commonStyles}</style></head><body><div class="container">${logoHeader}<div class="content"><span class="badge" style="background: rgba(16, 185, 129, 0.15); border-color: rgba(16, 185, 129, 0.35); color: #34d399;">Assessment Results</span><h1>Your Quiz Has Been Graded 🎉</h1><p>Hello ${toName},</p><p>Your submission for the following assessment has been evaluated by your instructor:</p><div class="card" style="border-left-color: #10b981;"><div class="card-title">${assessmentTitle}</div><div class="card-desc" style="font-size: 16px; margin-top: 8px; color: #ffffff;">Final Score: <strong style="color: #34d399;">${score} / ${maxScore} points</strong> (${Math.round((score / (maxScore || 1)) * 100)}%)</div></div><div class="btn-container"><a href="https://kairos-production-lms.vercel.app/login" class="btn">View Grade Breakdown</a></div></div><div class="footer">&copy; ${new Date().getFullYear()} iTech Academy. All rights reserved.</div></div></body></html>
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
      text: `Hello ${toName},\n\nYour quiz "${assessmentTitle}" has been graded: ${score}/${maxScore}.\n\nLog in at https://kairos-production-lms.vercel.app/login to review.`,
      html: htmlContent,
    });
    return { success: true, mode: "smtp" };
  } catch (error) {
    console.error("Error sending quiz graded email via SMTP:", error);
    logConsoleFallback("Quiz Graded Email [RUNTIME ERROR - FALLBACK]", toEmail, toName, `Quiz: ${assessmentTitle}, Score: ${score}/${maxScore}`);
    return { success: false, mode: "console" };
  }
}

export async function sendCertificateRequestedEmail(
  toEmail: string,
  toName: string,
  studentName: string,
  courseName: string
): Promise<{ success: boolean; mode: "smtp" | "console" }> {
  const htmlContent = `
    <!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate Request — iTech Academy</title><style>${commonStyles}</style></head><body><div class="container">${logoHeader}<div class="content"><span class="badge" style="background: rgba(168, 85, 247, 0.15); border-color: rgba(168, 85, 247, 0.35); color: #c084fc;">Certificate Review</span><h1>New Certificate Request</h1><p>Hello ${toName},</p><p>A student has passed the final examination requirements and requested their official course completion certificate:</p><div class="card" style="border-left-color: #a855f7;"><div class="card-title">${courseName}</div><div class="card-desc">Requested by: <strong>${studentName}</strong></div></div><div class="btn-container"><a href="https://kairos-production-lms.vercel.app/login" class="btn" style="background: linear-gradient(135deg, #9333ea 0%, #7e22ce 100%); box-shadow: 0 8px 24px rgba(147, 51, 234, 0.35);">Review Certificate Request</a></div></div><div class="footer">&copy; ${new Date().getFullYear()} iTech Academy. All rights reserved.</div></div></body></html>
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
      text: `Hello ${toName},\n\n${studentName} has requested a certificate for "${courseName}".\n\nLog in at https://kairos-production-lms.vercel.app/login to review.`,
      html: htmlContent,
    });
    return { success: true, mode: "smtp" };
  } catch (error) {
    console.error("Error sending certificate request email via SMTP:", error);
    logConsoleFallback("Certificate Requested Email [RUNTIME ERROR - FALLBACK]", toEmail, toName, `Student: ${studentName}, Course: ${courseName}`);
    return { success: false, mode: "console" };
  }
}

export async function sendCertificateApprovedEmail(
  toEmail: string,
  toName: string,
  courseName: string
): Promise<{ success: boolean; mode: "smtp" | "console" }> {
  const htmlContent = `
    <!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate Approved! — iTech Academy</title><style>${commonStyles}</style></head><body><div class="container">${logoHeader}<div class="content"><span class="badge" style="background: rgba(234, 179, 8, 0.15); border-color: rgba(234, 179, 8, 0.35); color: #facc15;">Official Certification</span><h1>Congratulations! 🎉</h1><p>Hello ${toName},</p><p>Outstanding achievement! Your official certificate of completion has been approved by the academic faculty:</p><div class="card" style="border-left-color: #eab308; background: #1a1710;"><div class="card-title" style="color: #fef08a;">${courseName}</div><div class="card-desc" style="color: #fde047;">Your verified certificate is ready for viewing and PDF download.</div></div><div class="btn-container"><a href="https://kairos-production-lms.vercel.app/login" class="btn" style="background: linear-gradient(135deg, #d97706 0%, #b45309 100%); box-shadow: 0 8px 24px rgba(217, 119, 6, 0.35);">Download Certificate PDF</a></div></div><div class="footer">&copy; ${new Date().getFullYear()} iTech Academy. All rights reserved.</div></div></body></html>
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
      text: `Hello ${toName},\n\nCongratulations! Your certificate of completion for "${courseName}" has been approved.\n\nLog in at https://kairos-production-lms.vercel.app/login to download it.`,
      html: htmlContent,
    });
    return { success: true, mode: "smtp" };
  } catch (error) {
    console.error("Error sending certificate approved email via SMTP:", error);
    logConsoleFallback("Certificate Approved Email [RUNTIME ERROR - FALLBACK]", toEmail, toName, `Course: ${courseName}`);
    return { success: false, mode: "console" };
  }
}

export async function sendCertificateRejectedEmail(
  toEmail: string,
  toName: string,
  courseName: string,
  reason: string
): Promise<{ success: boolean; mode: "smtp" | "console" }> {
  const htmlContent = `
    <!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate Update — iTech Academy</title><style>${commonStyles}</style></head><body><div class="container">${logoHeader}<div class="content"><span class="badge" style="background: rgba(239, 68, 68, 0.15); border-color: rgba(239, 68, 68, 0.35); color: #f87171;">Certificate Revision</span><h1>Certificate Request Update</h1><p>Hello ${toName},</p><p>We are writing to inform you that your certificate request requires a minor revision before final approval:</p><div class="card" style="border-left-color: #ef4444;"><div class="card-title">${courseName}</div><div class="card-desc" style="color: #ffffff; margin-top: 6px;">Reason: <strong>${reason}</strong></div></div><div class="btn-container"><a href="https://kairos-production-lms.vercel.app/login" class="btn">Update Submission</a></div></div><div class="footer">&copy; ${new Date().getFullYear()} iTech Academy. All rights reserved.</div></div></body></html>
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

export async function sendMessageNotificationEmail(
  toEmail: string,
  toName: string,
  senderName: string,
  subject: string,
  body: string
): Promise<{ success: boolean; mode: "smtp" | "console" }> {
  const htmlContent = `
    <!DOCTYPE html><html><head><meta charset="utf-8"><title>New Message — iTech Academy</title><style>${commonStyles}</style></head><body><div class="container">${logoHeader}<div class="content"><span class="badge">Inbox Notification</span><h1>New Message Received</h1><p>Hello ${toName},</p><p>You have received a new direct message from <strong>${senderName}</strong>:</p><div class="card"><div class="card-title">${subject}</div><p style="color: #ffffff; font-style: italic; margin-top: 8px; margin-bottom: 0; line-height: 1.6;">"${body}"</p></div><div class="btn-container"><a href="https://kairos-production-lms.vercel.app/login" class="btn">Reply in Portal</a></div></div><div class="footer">&copy; ${new Date().getFullYear()} iTech Academy. All rights reserved.</div></div></body></html>
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
      text: `Hello ${toName},\n\nYou received a new message from ${senderName}.\n\nSubject: ${subject}\n\nMessage: "${body}"\n\nLog in at https://kairos-production-lms.vercel.app/login to reply.`,
      html: htmlContent,
    });
    return { success: true, mode: "smtp" };
  } catch (error) {
    console.error("Error sending message notification email via SMTP:", error);
    logConsoleFallback("New Message Email [RUNTIME ERROR - FALLBACK]", toEmail, toName, `From: ${senderName}, Subject: ${subject}`);
    return { success: false, mode: "console" };
  }
}

export async function sendAnnouncementEmail(
  toEmail: string,
  toName: string,
  courseName: string,
  announcementTitle: string,
  announcementBody: string
): Promise<{ success: boolean; mode: "smtp" | "console" }> {
  const htmlContent = `
    <!DOCTYPE html><html><head><meta charset="utf-8"><title>New Announcement — iTech Academy</title><style>${commonStyles}</style></head><body><div class="container">${logoHeader}<div class="content"><span class="badge">Broadcast Alert</span><h1>New Course Announcement</h1><p>Hello ${toName},</p><p>An announcement has been published in <strong>${courseName}</strong>:</p><div class="card"><div class="card-title">${announcementTitle}</div><p style="color: #ffffff; margin-top: 8px; margin-bottom: 0; line-height: 1.6;">${announcementBody}</p></div><div class="btn-container"><a href="https://kairos-production-lms.vercel.app/login" class="btn">View Announcement</a></div></div><div class="footer">&copy; ${new Date().getFullYear()} iTech Academy. All rights reserved.</div></div></body></html>
  `;

  if (!isConfigured || !transporter) {
    logConsoleFallback("Course Announcement Email", toEmail, toName, `Course: ${courseName}, Title: ${announcementTitle}`);
    return { success: true, mode: "console" };
  }

  try {
    await transporter.sendMail({
      from: smtpFrom,
      to: toEmail,
      subject: `Announcement: ${announcementTitle} [${courseName}]`,
      text: `Hello ${toName},\n\nA new announcement has been published in ${courseName}:\n\nTitle: ${announcementTitle}\n\n"${announcementBody}"\n\nLog in at https://kairos-production-lms.vercel.app/login to read.`,
      html: htmlContent,
    });
    return { success: true, mode: "smtp" };
  } catch (error) {
    console.error("Error sending announcement email via SMTP:", error);
    logConsoleFallback("Course Announcement Email [RUNTIME ERROR - FALLBACK]", toEmail, toName, `Course: ${courseName}, Title: ${announcementTitle}`);
    return { success: false, mode: "console" };
  }
}

export async function sendCalendarEventEmail(
  toEmail: string,
  toName: string,
  courseName: string,
  eventTitle: string,
  eventDate: string,
  eventDescription: string
): Promise<{ success: boolean; mode: "smtp" | "console" }> {
  const htmlContent = `
    <!DOCTYPE html><html><head><meta charset="utf-8"><title>New Event — iTech Academy</title><style>${commonStyles}</style></head><body><div class="container">${logoHeader}<div class="content"><span class="badge" style="background: rgba(14, 165, 233, 0.15); border-color: rgba(14, 165, 233, 0.35); color: #38bdf8;">Schedule Alert</span><h1>New Calendar Event Scheduled</h1><p>Hello ${toName},</p><p>A new calendar event has been added to <strong>${courseName}</strong>:</p><div class="card" style="border-left-color: #0ea5e9;"><div class="card-title">${eventTitle}</div><div class="card-desc" style="color: #38bdf8; margin-top: 4px; margin-bottom: 8px;">Date & Time: <strong>${eventDate}</strong></div><p style="color: #ffffff; margin: 0; line-height: 1.6;">${eventDescription}</p></div><div class="btn-container"><a href="https://kairos-production-lms.vercel.app/login" class="btn" style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); box-shadow: 0 8px 24px rgba(2, 132, 199, 0.35);">Add to Calendar</a></div></div><div class="footer">&copy; ${new Date().getFullYear()} iTech Academy. All rights reserved.</div></div></body></html>
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
      text: `Hello ${toName},\n\nA new calendar event has been added for ${courseName}:\n\nEvent: ${eventTitle}\nDate & Time: ${eventDate}\nDescription: "${eventDescription}"\n\nLog in at https://kairos-production-lms.vercel.app/login to view your calendar.`,
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
