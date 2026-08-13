import fs from "fs";
import path from "path";

const logoPath = path.join(process.cwd(), "public", "logo.png");
let logoSrc = "https://kairos-production-lms.vercel.app/logo.png";

if (fs.existsSync(logoPath)) {
  const logoBuffer = fs.readFileSync(logoPath);
  logoSrc = `data:image/png;base64,${logoBuffer.toString("base64")}`;
}

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
    position: relative;
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

const logoHeader = `<div class="header"><img src="${logoSrc}" alt="iTech Academy Logo" class="logo-img" /><div class="logo-text">iTech Academy</div></div>`;

const templates = [
  {
    filename: "01-email-verification.html",
    title: "1. Email Verification Code",
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Verify Your Email — iTech Academy</title><style>${commonStyles}</style></head><body><div class="container">${logoHeader}<div class="content"><span class="badge">Security Verification</span><h1>Verify Your Email Address</h1><p>Hello Rhemanth Jeyanez,</p><p>Thank you for creating an account on iTech Academy. Please enter the 6-digit activation code below to verify your email and unlock your learning portal:</p><div class="code-box">849201</div><p style="font-size: 13px; color: #71717a;">This verification code will expire in 24 hours. If you did not sign up for an iTech Academy account, please ignore this email.</p></div><div class="footer">&copy; 2026 iTech Academy. All rights reserved.</div></div></body></html>`
  },
  {
    filename: "02-password-reset.html",
    title: "2. Password Reset Security Code",
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Reset Your Password — iTech Academy</title><style>${commonStyles}</style></head><body><div class="container">${logoHeader}<div class="content"><span class="badge" style="background: rgba(239, 68, 68, 0.15); border-color: rgba(239, 68, 68, 0.35); color: #f87171;">Account Security</span><h1>Reset Your Password</h1><p>Hello Rhemanth Jeyanez,</p><p>We received a request to reset the password for your iTech Academy account. Use the secure single-use passcode below to proceed:</p><div class="code-box">491028</div><p style="font-size: 13px; color: #71717a;">This security code will expire in 2 hours. If you didn't request a password reset, your account is safe and you can safely ignore this email.</p></div><div class="footer">&copy; 2026 iTech Academy. All rights reserved.</div></div></body></html>`
  },
  {
    filename: "03-course-assigned.html",
    title: "3. Student Course Assignment",
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Course Assigned — iTech Academy</title><style>${commonStyles}</style></head><body><div class="container">${logoHeader}<div class="content"><span class="badge" style="background: rgba(16, 185, 129, 0.15); border-color: rgba(16, 185, 129, 0.35); color: #34d399;">New Enrollment</span><h1>New Course Assigned 🎉</h1><p>Hello Rhemanth Jeyanez,</p><p>Great news! An instructor has assigned a new learning path to your student dashboard. You can begin accessing your course modules immediately:</p><div class="card"><div class="card-title">Full-Stack Web Development Mastery</div><div class="card-desc">Course Code: <strong>CS-401</strong> &bull; Access: Lifetime Access</div></div><div class="btn-container"><a href="https://kairos-production-lms.vercel.app/login" class="btn">Launch Course Dashboard</a></div></div><div class="footer">&copy; 2026 iTech Academy. All rights reserved.</div></div></body></html>`
  },
  {
    filename: "04-student-nudge.html",
    title: "4. Student Engagement Reminder",
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><title>We Miss You — iTech Academy</title><style>${commonStyles}</style></head><body><div class="container">${logoHeader}<div class="content"><span class="badge" style="background: rgba(245, 158, 11, 0.15); border-color: rgba(245, 158, 11, 0.35); color: #fbbf24;">Progress Reminder</span><h1>We Miss You! 👋</h1><p>Hello Rhemanth Jeyanez,</p><p>We noticed you haven't logged in recently. Here is a personal message from your academic manager:</p><div class="card" style="border-left-color: #f59e0b;"><p style="color: #ffffff; font-style: italic; margin: 0; font-size: 15px; line-height: 1.6;">"Don't forget to complete Module 4 of Full-Stack Web Development. You're already at 80% progress — keep up the momentum!"</p></div><div class="btn-container"><a href="https://kairos-production-lms.vercel.app/login" class="btn">Resume Learning</a></div></div><div class="footer">&copy; 2026 iTech Academy. All rights reserved.</div></div></body></html>`
  },
  {
    filename: "05-teacher-course-assigned.html",
    title: "5. Teacher Course Assignment",
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Teaching Assignment — iTech Academy</title><style>${commonStyles}</style></head><body><div class="container">${logoHeader}<div class="content"><span class="badge">Faculty Assignment</span><h1>New Teaching Assignment</h1><p>Hello Instructor Rhemanth Jeyanez,</p><p>You have been assigned as the primary instructor for the following course module. You now have full permission to build syllabus sections, upload labs, create quizzes, and evaluate student submissions:</p><div class="card"><div class="card-title">Advanced React & Next.js Systems</div><div class="card-desc">Course Code: <strong>CS-502</strong> &bull; Status: Active</div></div><div class="btn-container"><a href="https://kairos-production-lms.vercel.app/login" class="btn">Open Teacher Portal</a></div></div><div class="footer">&copy; 2026 iTech Academy. All rights reserved.</div></div></body></html>`
  },
  {
    filename: "06-quiz-submission-teacher.html",
    title: "6. New Quiz Submission (For Teacher)",
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><title>New Quiz Submission — iTech Academy</title><style>${commonStyles}</style></head><body><div class="container">${logoHeader}<div class="content"><span class="badge" style="background: rgba(59, 130, 246, 0.15); border-color: rgba(59, 130, 246, 0.35); color: #60a5fa;">Grading Alert</span><h1>New Quiz Submission Received</h1><p>Hello Rhemanth Jeyanez,</p><p>A student has completed an assessment and submitted their responses for instructor review:</p><div class="card" style="border-left-color: #3b82f6;"><div class="card-title">Midterm Assessment: Microservices</div><div class="card-desc">Submitted by: <strong>Alex Rivers</strong> &bull; Course: Full-Stack Web Development</div></div><div class="btn-container"><a href="https://kairos-production-lms.vercel.app/login" class="btn" style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); box-shadow: 0 8px 24px rgba(37, 99, 235, 0.35);">Open Grading Panel</a></div></div><div class="footer">&copy; 2026 iTech Academy. All rights reserved.</div></div></body></html>`
  },
  {
    filename: "07-quiz-graded-student.html",
    title: "7. Quiz Graded (For Student)",
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Quiz Graded — iTech Academy</title><style>${commonStyles}</style></head><body><div class="container">${logoHeader}<div class="content"><span class="badge" style="background: rgba(16, 185, 129, 0.15); border-color: rgba(16, 185, 129, 0.35); color: #34d399;">Assessment Results</span><h1>Your Quiz Has Been Graded 🎉</h1><p>Hello Rhemanth Jeyanez,</p><p>Your submission for the following assessment has been evaluated by your instructor:</p><div class="card" style="border-left-color: #10b981;"><div class="card-title">Midterm Assessment: Microservices</div><div class="card-desc" style="font-size: 16px; margin-top: 8px; color: #ffffff;">Final Score: <strong style="color: #34d399;">95 / 100 points</strong> (95% Distinction)</div></div><div class="btn-container"><a href="https://kairos-production-lms.vercel.app/login" class="btn">View Grade Breakdown</a></div></div><div class="footer">&copy; 2026 iTech Academy. All rights reserved.</div></div></body></html>`
  },
  {
    filename: "08-certificate-requested.html",
    title: "8. Certificate Requested Alert",
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate Request — iTech Academy</title><style>${commonStyles}</style></head><body><div class="container">${logoHeader}<div class="content"><span class="badge" style="background: rgba(168, 85, 247, 0.15); border-color: rgba(168, 85, 247, 0.35); color: #c084fc;">Certificate Review</span><h1>New Certificate Request</h1><p>Hello Rhemanth Jeyanez,</p><p>A student has passed the final examination requirements and requested their official course completion certificate:</p><div class="card" style="border-left-color: #a855f7;"><div class="card-title">Full-Stack Web Development Mastery</div><div class="card-desc">Requested by: <strong>Alex Rivers</strong></div></div><div class="btn-container"><a href="https://kairos-production-lms.vercel.app/login" class="btn" style="background: linear-gradient(135deg, #9333ea 0%, #7e22ce 100%); box-shadow: 0 8px 24px rgba(147, 51, 234, 0.35);">Review Certificate Request</a></div></div><div class="footer">&copy; 2026 iTech Academy. All rights reserved.</div></div></body></html>`
  },
  {
    filename: "09-certificate-approved.html",
    title: "9. Certificate Approved Celebration",
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate Approved! — iTech Academy</title><style>${commonStyles}</style></head><body><div class="container">${logoHeader}<div class="content"><span class="badge" style="background: rgba(234, 179, 8, 0.15); border-color: rgba(234, 179, 8, 0.35); color: #facc15;">Official Certification</span><h1>Congratulations! 🎉</h1><p>Hello Rhemanth Jeyanez,</p><p>Outstanding achievement! Your official certificate of completion has been approved by the academic faculty:</p><div class="card" style="border-left-color: #eab308; background: #1a1710;"><div class="card-title" style="color: #fef08a;">Full-Stack Web Development Mastery</div><div class="card-desc" style="color: #fde047;">Your verified certificate is ready for viewing and PDF download.</div></div><div class="btn-container"><a href="https://kairos-production-lms.vercel.app/login" class="btn" style="background: linear-gradient(135deg, #d97706 0%, #b45309 100%); box-shadow: 0 8px 24px rgba(217, 119, 6, 0.35);">Download Certificate PDF</a></div></div><div class="footer">&copy; 2026 iTech Academy. All rights reserved.</div></div></body></html>`
  },
  {
    filename: "10-certificate-rejected.html",
    title: "10. Certificate Request Revision Update",
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate Update — iTech Academy</title><style>${commonStyles}</style></head><body><div class="container">${logoHeader}<div class="content"><span class="badge" style="background: rgba(239, 68, 68, 0.15); border-color: rgba(239, 68, 68, 0.35); color: #f87171;">Certificate Revision</span><h1>Certificate Request Update</h1><p>Hello Rhemanth Jeyanez,</p><p>We are writing to inform you that your certificate request requires a minor revision before final approval:</p><div class="card" style="border-left-color: #ef4444;"><div class="card-title">Full-Stack Web Development Mastery</div><div class="card-desc" style="color: #ffffff; margin-top: 6px;">Reason: <strong>Please resubmit final capstone project repository URL in your student portal.</strong></div></div><div class="btn-container"><a href="https://kairos-production-lms.vercel.app/login" class="btn">Update Submission</a></div></div><div class="footer">&copy; 2026 iTech Academy. All rights reserved.</div></div></body></html>`
  },
  {
    filename: "11-message-notification.html",
    title: "11. Direct Message Alert",
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><title>New Message — iTech Academy</title><style>${commonStyles}</style></head><body><div class="container">${logoHeader}<div class="content"><span class="badge">Inbox Notification</span><h1>New Message Received</h1><p>Hello Rhemanth Jeyanez,</p><p>You have received a new direct message from <strong>Dr. Sarah Jenkins</strong>:</p><div class="card"><div class="card-title">Office Hours Schedule Update</div><p style="color: #ffffff; font-style: italic; margin-top: 8px; margin-bottom: 0; line-height: 1.6;">"Hi Rhemanth, tomorrow's office hours have been moved to 3 PM EST. See you in the portal!"</p></div><div class="btn-container"><a href="https://kairos-production-lms.vercel.app/login" class="btn">Reply in Portal</a></div></div><div class="footer">&copy; 2026 iTech Academy. All rights reserved.</div></div></body></html>`
  },
  {
    filename: "12-course-announcement.html",
    title: "12. Course Announcement Broadcast",
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><title>New Announcement — iTech Academy</title><style>${commonStyles}</style></head><body><div class="container">${logoHeader}<div class="content"><span class="badge">Broadcast Alert</span><h1>New Course Announcement</h1><p>Hello Rhemanth Jeyanez,</p><p>An announcement has been published in <strong>Full-Stack Web Development Mastery</strong>:</p><div class="card"><div class="card-title">New Lecture & Code Repository Added</div><p style="color: #ffffff; margin-top: 8px; margin-bottom: 0; line-height: 1.6;">Check out Section 5 for the latest code samples and video walkthroughs. Happy coding!</p></div><div class="btn-container"><a href="https://kairos-production-lms.vercel.app/login" class="btn">View Announcement</a></div></div><div class="footer">&copy; 2026 iTech Academy. All rights reserved.</div></div></body></html>`
  },
  {
    filename: "13-calendar-event.html",
    title: "13. Calendar Event Reminder",
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><title>New Event — iTech Academy</title><style>${commonStyles}</style></head><body><div class="container">${logoHeader}<div class="content"><span class="badge" style="background: rgba(14, 165, 233, 0.15); border-color: rgba(14, 165, 233, 0.35); color: #38bdf8;">Schedule Alert</span><h1>New Calendar Event Scheduled</h1><p>Hello Rhemanth Jeyanez,</p><p>A new calendar event has been added to <strong>Full-Stack Web Development Mastery</strong>:</p><div class="card" style="border-left-color: #0ea5e9;"><div class="card-title">Live Q&A Webinar with Tech Leads</div><div class="card-desc" style="color: #38bdf8; margin-top: 4px; margin-bottom: 8px;">Date & Time: <strong>Friday, 4:00 PM EST</strong></div><p style="color: #ffffff; margin: 0; line-height: 1.6;">Join our senior engineers for a live code review and Q&A session. Access link is in your dashboard.</p></div><div class="btn-container"><a href="https://kairos-production-lms.vercel.app/login" class="btn" style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); box-shadow: 0 8px 24px rgba(2, 132, 199, 0.35);">Add to Calendar</a></div></div><div class="footer">&copy; 2026 iTech Academy. All rights reserved.</div></div></body></html>`
  }
];

const outDir = path.join(process.cwd(), "email-previews");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

for (const t of templates) {
  const filePath = path.join(outDir, t.filename);
  fs.writeFileSync(filePath, t.html, "utf-8");
  console.log(`✨ Preview Generated with user's exact uploaded logo: ${t.filename}`);
}

console.log(`\n🎉 All 13 Email Previews updated with new logo in: ${outDir}`);
