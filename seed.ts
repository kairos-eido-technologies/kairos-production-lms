import bcrypt from "bcryptjs";
import { getDb, closeDb } from "./src/lib/db/client";
import {
  users,
  courses,
  sections,
  contentItems,
  files,
  enrollments,
  progress,
  questions,
  assessments,
  submissionResponses,
  submissions,
  certificates,
  notifications,
  messages,
  events,
  announcements,
  discussions,
  discussionReplies,
  videoCheckpoints,
  checkpointProgress,
} from "./src/lib/db/schema";

async function main() {
  const db = getDb();
  console.log("Seeding database with full functional LMS dataset...");

  try {
    // 1. Clean up existing records in order to respect FK constraints
    console.log("Cleaning up existing database records...");
    await db.delete(checkpointProgress);
    await db.delete(videoCheckpoints);
    await db.delete(discussionReplies);
    await db.delete(discussions);
    await db.delete(announcements);
    await db.delete(events);
    await db.delete(submissionResponses);
    await db.delete(submissions);
    await db.delete(progress);
    await db.delete(enrollments);
    await db.delete(certificates);
    await db.delete(notifications);
    await db.delete(messages);
    await db.delete(files);
    await db.delete(questions);
    await db.delete(assessments);
    await db.delete(contentItems);
    await db.delete(sections);
    await db.delete(courses);
    await db.delete(users);

    // 2. Generate password hashes
    const adminPasswordHash = await bcrypt.hash("admin123", 10);
    const teacherPasswordHash = await bcrypt.hash("teacher123", 10);
    const studentPasswordHash = await bcrypt.hash("student123", 10);

    // 3. Seed Users
    console.log("Seeding users...");
    await db.insert(users).values([
      {
        id: "ADM01",
        name: "Administrator",
        email: "admin@itech.com",
        passwordHash: adminPasswordHash,
        role: "admin",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
        status: "active",
        joinedAt: new Date("2025-01-01T00:00:00.000Z"),
        isEmailVerified: true,
        phone: "+1 (555) 019-2834",
      },
      {
        id: "TCH01",
        name: "Dr. Alan Turing",
        email: "teacher@itech.com",
        passwordHash: teacherPasswordHash,
        role: "teacher",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80",
        status: "active",
        joinedAt: new Date("2025-01-15T00:00:00.000Z"),
        isEmailVerified: true,
        phone: "+1 (555) 018-9922",
      },
      {
        id: "TCH02",
        name: "Prof. Sarah Connor",
        email: "sarah.connor@itech.com",
        passwordHash: teacherPasswordHash,
        role: "teacher",
        avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80",
        status: "active",
        joinedAt: new Date("2025-02-01T00:00:00.000Z"),
        isEmailVerified: true,
        phone: "+1 (555) 014-7711",
      },
      {
        id: "STD01",
        name: "Alex Johnson",
        email: "student@itech.com",
        passwordHash: studentPasswordHash,
        role: "student",
        avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=250&q=80",
        status: "active",
        joinedAt: new Date("2025-02-10T00:00:00.000Z"),
        isEmailVerified: true,
        phone: "+1 (555) 012-3456",
      },
      {
        id: "STD02",
        name: "Maria Garcia",
        email: "maria@itech.com",
        passwordHash: studentPasswordHash,
        role: "student",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80",
        status: "active",
        joinedAt: new Date("2025-02-12T00:00:00.000Z"),
        isEmailVerified: true,
        phone: "+1 (555) 016-8833",
      },
      {
        id: "STD03",
        name: "David Kim",
        email: "david@itech.com",
        passwordHash: studentPasswordHash,
        role: "student",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80",
        status: "active",
        joinedAt: new Date("2025-02-20T00:00:00.000Z"),
        isEmailVerified: true,
        phone: "+1 (555) 011-4455",
      },
    ]);

    // 4. Seed Courses
    console.log("Seeding courses...");
    await db.insert(courses).values([
      {
        id: "CRS01",
        name: "Full-Stack Web Development Masterclass",
        code: "FS101",
        description: "Master modern web development using HTML5, CSS Grid/Flexbox, React 19, TypeScript, Node.js, and PostgreSQL with Drizzle ORM.",
        teacherId: "TCH01",
        thumbnail: "💻",
        startDate: new Date("2025-01-01T00:00:00.000Z"),
        endDate: new Date("2026-12-31T23:59:59.000Z"),
        accessMode: "lifetime",
        status: "active",
        showInPreview: true,
        previewVideoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      },
      {
        id: "CRS02",
        name: "Python & Data Science Fundamentals",
        code: "PY201",
        description: "Comprehensive guide to Python programming, data analysis with Pandas and NumPy, data visualization, and intro to Machine Learning.",
        teacherId: "TCH02",
        thumbnail: "🐍",
        startDate: new Date("2025-02-01T00:00:00.000Z"),
        endDate: new Date("2026-12-31T23:59:59.000Z"),
        accessMode: "lifetime",
        status: "active",
        showInPreview: true,
        previewVideoUrl: "https://www.youtube.com/watch?v=rfscV00zUVU",
      },
      {
        id: "CRS03",
        name: "Cloud Architecture & DevOps Essentials",
        code: "DEV301",
        description: "Learn Docker, Kubernetes, CI/CD pipelines, AWS infrastructure management, and cloud deployment best practices.",
        teacherId: "TCH01",
        thumbnail: "☁️",
        startDate: new Date("2025-03-01T00:00:00.000Z"),
        endDate: new Date("2026-12-31T23:59:59.000Z"),
        accessMode: "lifetime",
        status: "active",
        showInPreview: true,
      },
    ]);

    // 5. Seed Sections
    console.log("Seeding course sections...");
    await db.insert(sections).values([
      // CRS01 sections
      { id: "SEC01", courseId: "CRS01", title: "Module 1: Introduction to Web Technologies", order: 1 },
      { id: "SEC02", courseId: "CRS01", title: "Module 2: React & Modern Frontend Architecture", order: 2 },
      { id: "SEC03", courseId: "CRS01", title: "Module 3: Database & Backend Engineering", order: 3 },
      // CRS02 sections
      { id: "SEC04", courseId: "CRS02", title: "Module 1: Python Core Syntax & Data Structures", order: 1 },
      { id: "SEC05", courseId: "CRS02", title: "Module 2: Data Analysis with Pandas & NumPy", order: 2 },
    ]);

    // 6. Seed Assessments & Questions
    console.log("Seeding assessments & questions...");
    await db.insert(assessments).values([
      {
        id: "ASM01",
        courseId: "CRS01",
        title: "Module 2 Knowledge Quiz",
        timeLimit: 15,
        passingScore: 70,
        attempts: 3,
        questionCount: 3,
        proctored: false,
        isFinal: false,
      },
      {
        id: "ASM02",
        courseId: "CRS01",
        title: "Full-Stack Web Development Final Exam",
        timeLimit: 45,
        passingScore: 80,
        attempts: 2,
        questionCount: 4,
        proctored: true,
        isFinal: true,
      },
      {
        id: "ASM03",
        courseId: "CRS02",
        title: "Python Fundamentals Assessment",
        timeLimit: 20,
        passingScore: 70,
        attempts: 3,
        questionCount: 2,
        proctored: false,
        isFinal: false,
      },
    ]);

    await db.insert(questions).values([
      // ASM01 Questions
      {
        id: "QST01",
        assessmentId: "ASM01",
        type: "mcq",
        prompt: "Which React hook is designed for handling asynchronous side-effects?",
        options: ["useState", "useEffect", "useContext", "useReducer"],
        correctIndex: 1,
        points: 1,
        order: 1,
      },
      {
        id: "QST02",
        assessmentId: "ASM01",
        type: "truefalse",
        prompt: "Zustand provides centralized state management without requiring a Context Provider wrapper.",
        options: ["True", "False"],
        correctIndex: 0,
        points: 1,
        order: 2,
      },
      {
        id: "QST03",
        assessmentId: "ASM01",
        type: "mcq",
        prompt: "Which HTTP status code indicates an unauthenticated request?",
        options: ["200 OK", "400 Bad Request", "401 Unauthorized", "404 Not Found"],
        correctIndex: 2,
        points: 1,
        order: 3,
      },
      // ASM02 Questions (Final Exam)
      {
        id: "QST04",
        assessmentId: "ASM02",
        type: "mcq",
        prompt: "What is the key advantage of Server-Side Rendering (SSR) in full-stack frameworks?",
        options: [
          "Completely removes client JavaScript",
          "Improved SEO and faster initial page paint",
          "Eliminates the need for a database",
          "Prevents CSS style recalculation"
        ],
        correctIndex: 1,
        points: 2,
        order: 1,
      },
      {
        id: "QST05",
        assessmentId: "ASM02",
        type: "mcq",
        prompt: "What does ACID stand for in relational database management systems?",
        options: [
          "Atomicity, Consistency, Isolation, Durability",
          "Access, Control, Index, Data",
          "Async, Concurrent, Internal, Distributed",
          "Array, Column, Index, Directory"
        ],
        correctIndex: 0,
        points: 2,
        order: 2,
      },
      {
        id: "QST06",
        assessmentId: "ASM02",
        type: "truefalse",
        prompt: "JWTs (JSON Web Tokens) are digitally signed and can be verified statelessly by the backend server.",
        options: ["True", "False"],
        correctIndex: 0,
        points: 1,
        order: 3,
      },
      {
        id: "QST07",
        assessmentId: "ASM02",
        type: "mcq",
        prompt: "Which CLI command synchronizes Drizzle schema definitions directly with PostgreSQL?",
        options: ["drizzle generate", "npm run db:push", "drizzle compile", "npm run db:clean"],
        correctIndex: 1,
        points: 1,
        order: 4,
      },
      // ASM03 Questions
      {
        id: "QST08",
        assessmentId: "ASM03",
        type: "mcq",
        prompt: "Which Python library is standard for high-performance vectorized array computation?",
        options: ["Pandas", "NumPy", "Matplotlib", "Flask"],
        correctIndex: 1,
        points: 1,
        order: 1,
      },
      {
        id: "QST09",
        assessmentId: "ASM03",
        type: "truefalse",
        prompt: "List comprehensions in Python offer a concise syntax to create lists based on existing iterables.",
        options: ["True", "False"],
        correctIndex: 0,
        points: 1,
        order: 2,
      },
    ]);

    // 7. Seed Content Items
    console.log("Seeding content items...");
    await db.insert(contentItems).values([
      // SEC01 items
      {
        id: "CNT01",
        sectionId: "SEC01",
        type: "video",
        title: "HTML5 & Modern Web Semantics",
        url: "https://www.youtube.com/watch?v=kUMe1FH4CHE",
        duration: 15,
        order: 1,
        body: "In this lesson, we cover HTML5 semantic tags (<header>, <nav>, <article>, <aside>, <footer>) and accessible web design principles.",
      },
      {
        id: "CNT02",
        sectionId: "SEC01",
        type: "reading",
        title: "CSS Grid & Flexbox Layout Deep Dive",
        duration: 10,
        order: 2,
        body: `# CSS Layout Fundamentals

Flexbox and CSS Grid are the two core modern layout engines in standard CSS.

## When to use Flexbox
- **1D Layouts**: Aligning items along a single axis (row or column).
- **Component UI**: Navbars, button groups, form input rows.

## When to use CSS Grid
- **2D Layouts**: Managing both rows and columns simultaneously.
- **Page Structures**: Main dashboard layouts, card grids, gallery views.

\`\`\`css
.container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}
\`\`\`
`,
      },
      {
        id: "CNT03",
        sectionId: "SEC01",
        type: "lab",
        title: "Interactive Lab: Building a Responsive Product Card",
        duration: 30,
        order: 3,
        body: "Create a fully responsive product card component using HTML & CSS. Ensure text scales smoothly and hover effects use hardware-accelerated transforms.",
      },
      {
        id: "CNT04",
        sectionId: "SEC01",
        type: "pdf",
        title: "Web Developer Architecture Cheat Sheet",
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        fileName: "Web_Dev_Cheat_Sheet.pdf",
        fileSize: "1.2 MB",
        order: 4,
      },
      // SEC02 items
      {
        id: "CNT05",
        sectionId: "SEC02",
        type: "video",
        title: "React Components, Props, and State Management",
        url: "https://www.youtube.com/watch?v=bMknfKXIFA8",
        duration: 25,
        order: 1,
        body: "Learn how React 19 functional components render UI based on state and props.",
      },
      {
        id: "CNT06",
        sectionId: "SEC02",
        type: "reading",
        title: "State Management with Zustand & React Query",
        duration: 15,
        order: 2,
        body: "A comprehensive article comparing global state store patterns against server cache management with TanStack Query.",
      },
      {
        id: "CNT07",
        sectionId: "SEC02",
        type: "assessment",
        title: "Module 2 Knowledge Quiz",
        assessmentId: "ASM01",
        duration: 15,
        order: 3,
      },
      // SEC03 items
      {
        id: "CNT08",
        sectionId: "SEC03",
        type: "video",
        title: "Building Scalable APIs with Node.js & Drizzle ORM",
        url: "https://www.youtube.com/watch?v=0h2b4ftbZcU",
        duration: 30,
        order: 1,
        body: "Learn relational database design, type-safe SQL queries with Drizzle ORM, and secure API route construction.",
      },
      {
        id: "CNT09",
        sectionId: "SEC03",
        type: "assessment",
        title: "Full-Stack Web Development Final Exam",
        assessmentId: "ASM02",
        duration: 45,
        order: 2,
      },
      // SEC04 items
      {
        id: "CNT10",
        sectionId: "SEC04",
        type: "video",
        title: "Python Data Structures & OOP Mechanics",
        url: "https://www.youtube.com/watch?v=_uQrJ0TkZlc",
        duration: 20,
        order: 1,
      },
      {
        id: "CNT11",
        sectionId: "SEC04",
        type: "assessment",
        title: "Python Fundamentals Assessment",
        assessmentId: "ASM03",
        duration: 20,
        order: 2,
      },
    ]);

    // 8. Seed Video Checkpoints
    console.log("Seeding video checkpoints...");
    await db.insert(videoCheckpoints).values([
      {
        id: "CHK01",
        contentItemId: "CNT01",
        timestamp: 45,
        type: "mcq",
        prompt: "Which HTML5 semantic element is intended for primary website navigation links?",
        options: ["<div class='nav'>", "<nav>", "<header>", "<section>"],
        correctIndex: 1,
      },
      {
        id: "CHK02",
        contentItemId: "CNT01",
        timestamp: 120,
        type: "truefalse",
        prompt: "Using proper semantic tags improves document accessibility for screen readers.",
        options: ["True", "False"],
        correctIndex: 0,
      },
    ]);

    // 9. Seed Enrollments
    console.log("Seeding enrollments...");
    await db.insert(enrollments).values([
      {
        id: "ENR01",
        studentId: "STD01",
        courseId: "CRS01",
        accessMode: "lifetime",
        enrolledAt: new Date("2025-02-15T00:00:00.000Z"),
      },
      {
        id: "ENR02",
        studentId: "STD01",
        courseId: "CRS02",
        accessMode: "lifetime",
        enrolledAt: new Date("2025-02-18T00:00:00.000Z"),
      },
      {
        id: "ENR03",
        studentId: "STD02",
        courseId: "CRS01",
        accessMode: "lifetime",
        enrolledAt: new Date("2025-02-16T00:00:00.000Z"),
      },
      {
        id: "ENR04",
        studentId: "STD03",
        courseId: "CRS02",
        accessMode: "lifetime",
        enrolledAt: new Date("2025-02-22T00:00:00.000Z"),
      },
    ]);

    // 10. Seed Student Progress
    console.log("Seeding student progress...");
    await db.insert(progress).values([
      { id: "PRG01", studentId: "STD01", courseId: "CRS01", contentItemId: "CNT01", completedAt: new Date("2025-02-16T10:00:00.000Z") },
      { id: "PRG02", studentId: "STD01", courseId: "CRS01", contentItemId: "CNT02", completedAt: new Date("2025-02-16T11:30:00.000Z") },
      { id: "PRG03", studentId: "STD01", courseId: "CRS01", contentItemId: "CNT03", completedAt: new Date("2025-02-17T14:20:00.000Z") },
      { id: "PRG04", studentId: "STD01", courseId: "CRS01", contentItemId: "CNT04", completedAt: new Date("2025-02-17T15:00:00.000Z") },
      { id: "PRG05", studentId: "STD01", courseId: "CRS01", contentItemId: "CNT05", completedAt: new Date("2025-02-18T09:45:00.000Z") },
      { id: "PRG06", studentId: "STD02", courseId: "CRS01", contentItemId: "CNT01", completedAt: new Date("2025-02-18T16:00:00.000Z") },
    ]);

    // 11. Seed Checkpoint Progress
    await db.insert(checkpointProgress).values([
      { id: "CKP01", studentId: "STD01", checkpointId: "CHK01", isCorrect: true, answeredAt: new Date("2025-02-16T10:05:00.000Z") },
      { id: "CKP02", studentId: "STD01", checkpointId: "CHK02", isCorrect: true, answeredAt: new Date("2025-02-16T10:12:00.000Z") },
    ]);

    // 12. Seed Assessment Submissions & Responses
    console.log("Seeding assessment submissions...");
    await db.insert(submissions).values([
      {
        id: "SUB01",
        assessmentId: "ASM01",
        studentId: "STD01",
        submittedAt: new Date("2025-02-18T10:30:00.000Z"),
        status: "graded",
        feedback: "Excellent understanding of React state and HTTP standards!",
        proctorEvents: [],
      },
      {
        id: "SUB02",
        assessmentId: "ASM02",
        studentId: "STD01",
        submittedAt: new Date("2025-02-25T14:00:00.000Z"),
        status: "graded",
        feedback: "Outstanding score on the final exam. Certificate generated.",
        proctorEvents: [
          { at: "2025-02-25T13:45:10Z", type: "FACE_DETECTION", detail: "Face verified" }
        ],
      },
      {
        id: "SUB03",
        assessmentId: "ASM02",
        studentId: "STD02",
        submittedAt: new Date("2025-03-01T11:15:00.000Z"),
        status: "submitted",
        feedback: null,
        proctorEvents: [
          { at: "2025-03-01T11:05:22Z", type: "TAB_SWITCH", detail: "User switched tab once for 3 seconds" }
        ],
      },
    ]);

    await db.insert(submissionResponses).values([
      { id: "SBR01", submissionId: "SUB01", questionId: "QST01", response: "useEffect", awarded: 1 },
      { id: "SBR02", submissionId: "SUB01", questionId: "QST02", response: "True", awarded: 1 },
      { id: "SBR03", submissionId: "SUB01", questionId: "QST03", response: "401 Unauthorized", awarded: 1 },
      { id: "SBR04", submissionId: "SUB02", questionId: "QST04", response: "Improved SEO and faster initial page paint", awarded: 2 },
      { id: "SBR05", submissionId: "SUB02", questionId: "QST05", response: "Atomicity, Consistency, Isolation, Durability", awarded: 2 },
      { id: "SBR06", submissionId: "SUB02", questionId: "QST06", response: "True", awarded: 1 },
      { id: "SBR07", submissionId: "SUB02", questionId: "QST07", response: "npm run db:push", awarded: 1 },
    ]);

    // 13. Seed Certificates
    console.log("Seeding certificates...");
    await db.insert(certificates).values([
      {
        id: "CRT01",
        studentId: "STD01",
        courseId: "CRS01",
        score: 95,
        status: "approved",
        requestedAt: new Date("2025-02-25T14:05:00.000Z"),
        issuedAt: new Date("2025-02-26T09:00:00.000Z"),
        teacherNote: "Approved. High proficiency demonstrated.",
        proctorLog: [
          { at: "2025-02-25T13:45:10Z", type: "FACE_DETECTION", detail: "Face verified clean" }
        ],
      },
      {
        id: "CRT02",
        studentId: "STD02",
        courseId: "CRS01",
        score: 85,
        status: "pending",
        requestedAt: new Date("2025-03-01T11:20:00.000Z"),
        teacherNote: null,
        proctorLog: [
          { at: "2025-03-01T11:05:22Z", type: "TAB_SWITCH", detail: "User switched tab once for 3 seconds" }
        ],
      },
    ]);

    // 14. Seed Announcements
    console.log("Seeding announcements...");
    await db.insert(announcements).values([
      {
        id: "ANC01",
        courseId: "CRS01",
        title: "🚀 Welcome to Full-Stack Web Development Masterclass!",
        body: "Welcome everyone! Please start by watching Module 1 videos and reviewing the CSS Grid cheat sheet. Our live Q&A session will take place this Friday at 4 PM EST.",
        isPinned: true,
        createdAt: new Date("2025-02-01T09:00:00.000Z"),
      },
      {
        id: "ANC02",
        courseId: "CRS01",
        title: "📢 Final Exam & Certificate Guidelines",
        body: "The final exam is proctored. Ensure your camera is enabled and avoid switching tabs during the test. Minimum passing score is 80%.",
        isPinned: false,
        createdAt: new Date("2025-02-20T10:00:00.000Z"),
      },
      {
        id: "ANC03",
        courseId: "CRS02",
        title: "🐍 Python Bootcamp Kickoff",
        body: "Welcome to Python & Data Science. Make sure you have Python 3.11+ and Jupyter Notebook installed for Module 2 labs.",
        isPinned: true,
        createdAt: new Date("2025-02-05T08:30:00.000Z"),
      },
    ]);

    // 15. Seed Calendar Events
    console.log("Seeding calendar events...");
    await db.insert(events).values([
      {
        id: "EVT01",
        courseId: "CRS01",
        title: "Live Q&A: React 19 State & Hooks",
        description: "Interactive session answering student questions about Zustand, TanStack Query, and custom hooks.",
        eventDate: new Date("2026-08-10T16:00:00.000Z"),
      },
      {
        id: "EVT02",
        courseId: "CRS01",
        title: "Module 2 Quiz Deadline",
        description: "Deadline to complete the Module 2 knowledge assessment.",
        eventDate: new Date("2026-08-15T23:59:00.000Z"),
      },
      {
        id: "EVT03",
        courseId: "CRS02",
        title: "Pandas & Data Wrangling Workshop",
        description: "Hands-on data transformation exercise with real-world financial data.",
        eventDate: new Date("2026-08-18T14:00:00.000Z"),
      },
    ]);

    // 16. Seed Q&A Discussions & Replies
    console.log("Seeding discussions...");
    await db.insert(discussions).values([
      {
        id: "DSC01",
        courseId: "CRS01",
        userId: "STD01",
        title: "What is the recommended approach for JWT token storage in SPAs?",
        body: "Should we store JWT access tokens in localStorage, sessionStorage, or in-memory React state with HttpOnly cookies for refresh tokens?",
        createdAt: new Date("2025-02-18T11:00:00.000Z"),
      },
      {
        id: "DSC02",
        courseId: "CRS02",
        userId: "STD03",
        title: "Pandas dataframe column filtering performance",
        body: "Is query() faster than boolean indexing for large datasets (>1 million rows)?",
        createdAt: new Date("2025-02-23T14:15:00.000Z"),
      },
    ]);

    await db.insert(discussionReplies).values([
      {
        id: "RPL01",
        discussionId: "DSC01",
        userId: "TCH01",
        body: "HttpOnly cookies are the standard defense against XSS token exfiltration. In-memory Zustand storage paired with a secure refresh endpoint works exceptionally well for SPAs!",
        createdAt: new Date("2025-02-18T13:40:00.000Z"),
      },
      {
        id: "RPL02",
        discussionId: "DSC01",
        userId: "STD02",
        body: "Thanks for asking this! We implemented HttpOnly cookies in our team project and it simplified token rotation.",
        createdAt: new Date("2025-02-19T09:10:00.000Z"),
      },
    ]);

    // 17. Seed Messages
    console.log("Seeding messages...");
    await db.insert(messages).values([
      {
        id: "MSG01",
        fromId: "TCH01",
        toId: "STD01",
        subject: "Great job on the Web Masterclass Final Exam!",
        body: "Hi Alex, congratulations on scoring 95% on the final exam. Your certificate of completion has been approved and issued.",
        read: true,
        createdAt: new Date("2025-02-26T09:15:00.000Z"),
      },
      {
        id: "MSG02",
        fromId: "STD01",
        toId: "TCH01",
        subject: "Thank you Dr. Turing!",
        body: "Thank you so much! The Drizzle ORM and React modules were extremely practical and helpful.",
        read: false,
        createdAt: new Date("2025-02-26T10:00:00.000Z"),
      },
      {
        id: "MSG03",
        fromId: "STD02",
        toId: "TCH01",
        subject: "Question regarding Certificate Verification",
        body: "Hi Professor, I submitted my final exam earlier today and requested certificate issuance. Could you please check when you have a moment?",
        read: false,
        createdAt: new Date("2025-03-01T11:25:00.000Z"),
      },
    ]);

    // 18. Seed Notifications
    console.log("Seeding notifications...");
    await db.insert(notifications).values([
      {
        id: "NTF01",
        userId: "STD01",
        title: "Certificate Approved 🎉",
        message: "Your Certificate of Completion for Full-Stack Web Development Masterclass has been approved!",
        read: true,
        link: "/student/certificates",
        createdAt: new Date("2025-02-26T09:00:00.000Z"),
      },
      {
        id: "NTF02",
        userId: "STD01",
        title: "New Announcement",
        message: "Dr. Alan Turing posted a new announcement in Full-Stack Web Development.",
        read: false,
        link: "/student/courses/CRS01",
        createdAt: new Date("2025-02-20T10:00:00.000Z"),
      },
      {
        id: "NTF03",
        userId: "TCH01",
        title: "New Certificate Request 📜",
        message: "Maria Garcia has requested certificate approval for Full-Stack Web Development Masterclass.",
        read: false,
        link: "/teacher/certificates",
        createdAt: new Date("2025-03-01T11:20:00.000Z"),
      },
      {
        id: "NTF04",
        userId: "ADM01",
        title: "System Update Complete",
        message: "Database schema migration and seed data sync completed successfully.",
        read: true,
        link: "/admin",
        createdAt: new Date("2025-03-01T00:00:00.000Z"),
      },
    ]);

    console.log("✅ Complete LMS sample database seeded successfully!");
    console.log("-------------------------------------------------------");
    console.log("🔑 Available Test Accounts:");
    console.log("1. Admin:   admin@itech.com    / admin123");
    console.log("2. Teacher: teacher@itech.com  / teacher123");
    console.log("3. Student: student@itech.com  / student123");
    console.log("4. Student: maria@itech.com    / student123");
    console.log("-------------------------------------------------------");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    await closeDb();
  }
}

main();
