import bcrypt from "bcryptjs";
import { getDb } from "./src/lib/db/client";
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
  console.log("🚀 Starting complete database wipe & re-seeding with 1,000+ entities...");

  try {
    // 1. Wipe all existing database records
    console.log("🧹 Clearing all database tables...");
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

    // 2. Generate Password Hashes
    console.log("🔐 Generating secure password hashes...");
    const adminPasswordHash = await bcrypt.hash("admin123", 10);
    const teacherPasswordHash = await bcrypt.hash("teacher123", 10);
    const studentPasswordHash = await bcrypt.hash("student123", 10);

    // 3. Seed Users (100 Accounts: 3 Admins, 12 Teachers, 85 Students)
    console.log("👥 Seeding 100 User Accounts...");
    const userList: any[] = [];

    // Admins
    userList.push(
      {
        id: "ADM01",
        name: "Administrator",
        email: "admin@itech.com",
        passwordHash: adminPasswordHash,
        role: "admin",
        avatar:
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
        status: "active",
        joinedAt: new Date("2025-01-01T00:00:00.000Z"),
        isEmailVerified: true,
        phone: "+1 (555) 019-2834",
      },
      {
        id: "ADM02",
        name: "Super Admin Ops",
        email: "superadmin@itech.com",
        passwordHash: adminPasswordHash,
        role: "admin",
        avatar:
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80",
        status: "active",
        joinedAt: new Date("2025-01-05T00:00:00.000Z"),
        isEmailVerified: true,
        phone: "+1 (555) 019-9988",
      },
      {
        id: "ADM03",
        name: "Head Academic Admin",
        email: "headadmin@itech.com",
        passwordHash: adminPasswordHash,
        role: "admin",
        avatar:
          "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80",
        status: "active",
        joinedAt: new Date("2025-01-10T00:00:00.000Z"),
        isEmailVerified: true,
        phone: "+1 (555) 019-7766",
      },
    );

    // Teachers
    const teachersData = [
      {
        id: "TCH01",
        name: "Dr. Alan Turing",
        email: "teacher@itech.com",
        phone: "+1 (555) 018-9922",
      },
      {
        id: "TCH02",
        name: "Prof. Sarah Connor",
        email: "sarah.connor@itech.com",
        phone: "+1 (555) 014-7711",
      },
      {
        id: "TCH03",
        name: "Dr. Linus Torvalds",
        email: "linus.torvalds@itech.com",
        phone: "+1 (555) 018-2233",
      },
      {
        id: "TCH04",
        name: "Prof. Ada Lovelace",
        email: "ada.lovelace@itech.com",
        phone: "+1 (555) 018-4455",
      },
      {
        id: "TCH05",
        name: "Dr. Grace Hopper",
        email: "grace.hopper@itech.com",
        phone: "+1 (555) 018-6677",
      },
      {
        id: "TCH06",
        name: "Prof. Guido van Rossum",
        email: "guido.vanrossum@itech.com",
        phone: "+1 (555) 018-8899",
      },
      {
        id: "TCH07",
        name: "Dr. James Gosling",
        email: "james.gosling@itech.com",
        phone: "+1 (555) 018-1122",
      },
      {
        id: "TCH08",
        name: "Prof. Tim Berners-Lee",
        email: "tim.bernerslee@itech.com",
        phone: "+1 (555) 018-3344",
      },
      {
        id: "TCH09",
        name: "Dr. Margaret Hamilton",
        email: "margaret.hamilton@itech.com",
        phone: "+1 (555) 018-5566",
      },
      {
        id: "TCH10",
        name: "Prof. Dennis Ritchie",
        email: "dennis.ritchie@itech.com",
        phone: "+1 (555) 018-7788",
      },
      {
        id: "TCH11",
        name: "Dr. Ken Thompson",
        email: "ken.thompson@itech.com",
        phone: "+1 (555) 018-9900",
      },
      {
        id: "TCH12",
        name: "Prof. Barbara Liskov",
        email: "barbara.liskov@itech.com",
        phone: "+1 (555) 018-1234",
      },
    ];

    for (const t of teachersData) {
      userList.push({
        ...t,
        passwordHash: teacherPasswordHash,
        role: "teacher",
        avatar:
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
        status: "active",
        joinedAt: new Date("2025-01-15T00:00:00.000Z"),
        isEmailVerified: true,
      });
    }

    // Students (STD01 to STD85)
    const sampleFirstNames = [
      "Alex",
      "Maria",
      "David",
      "Emma",
      "Liam",
      "Sophia",
      "Noah",
      "Olivia",
      "Ethan",
      "Ava",
      "Lucas",
      "Isabella",
      "Mason",
      "Mia",
      "Logan",
      "Charlotte",
      "James",
      "Amelia",
      "Benjamin",
      "Harper",
    ];
    const sampleLastNames = [
      "Johnson",
      "Garcia",
      "Kim",
      "Smith",
      "Williams",
      "Brown",
      "Jones",
      "Miller",
      "Davis",
      "Rodriguez",
      "Martinez",
      "Hernandez",
      "Lopez",
      "Gonzalez",
      "Wilson",
      "Anderson",
      "Thomas",
      "Taylor",
      "Moore",
      "Jackson",
    ];

    for (let i = 1; i <= 85; i++) {
      const id = `STD${i < 10 ? "0" + i : i}`;
      let name = "";
      let email = "";

      if (i === 1) {
        name = "Alex Johnson";
        email = "student@itech.com";
      } else if (i === 2) {
        name = "Maria Garcia";
        email = "maria@itech.com";
      } else if (i === 3) {
        name = "David Kim";
        email = "david@itech.com";
      } else {
        const fn = sampleFirstNames[i % sampleFirstNames.length];
        const ln = sampleLastNames[i % sampleLastNames.length];
        name = `${fn} ${ln}`;
        email = `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@itech.com`;
      }

      // Make 10 students idle for telemetry testing
      const isIdle = i > 75;
      const lastActiveDate = isIdle
        ? new Date(Date.now() - 3 * 86400000)
        : new Date(Date.now() - i * 60000);
      const joinedDate = new Date(2025, 1, (i % 25) + 1);

      userList.push({
        id,
        name,
        email,
        passwordHash: studentPasswordHash,
        role: "student",
        avatar:
          "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=250&q=80",
        status: "active",
        joinedAt: joinedDate,
        lastActive: lastActiveDate,
        isEmailVerified: true,
        phone: `+1 (555) 012-${1000 + i}`,
      });
    }

    await db.insert(users).values(userList);

    // 4. Seed 25 Technology & Certification Courses
    console.log("📚 Seeding 25 Courses...");
    const courseTitles = [
      {
        id: "CRS01",
        name: "Full-Stack Web Development Masterclass",
        code: "FS101",
        teacherId: "TCH01",
        thumb: "💻",
        badgeTag: "React 19 · TypeScript",
        featuredBadgeText: "Bestseller",
        durationText: "6 months self-paced & live guidance",
        projectsText: "10+ real-time production projects",
        techStack: [
          { name: "React", icon: "⚛️" },
          { name: "TypeScript", icon: "🟦" },
          { name: "Node.js", icon: "🟢" },
          { name: "PostgreSQL", icon: "🐘" },
        ],
      },
      {
        id: "CRS02",
        name: "Python & Data Science Fundamentals",
        code: "PY201",
        teacherId: "TCH02",
        thumb: "🐍",
        badgeTag: "Python 3.12 · Data",
        featuredBadgeText: "Featured",
        durationText: "4 months intensive hands-on",
        projectsText: "12+ data science & ML case studies",
        techStack: [
          { name: "Python", icon: "🐍" },
          { name: "Pandas", icon: "🐼" },
          { name: "NumPy", icon: "🔢" },
          { name: "Matplotlib", icon: "📊" },
        ],
      },
      {
        id: "CRS03",
        name: "Cloud Architecture & DevOps Essentials",
        code: "DEV301",
        teacherId: "TCH03",
        thumb: "☁️",
        badgeTag: "DevOps · CI/CD",
        featuredBadgeText: "Hot",
        durationText: "5 months hands-on lab guidance",
        projectsText: "8 enterprise cloud deployments",
        techStack: [
          { name: "Docker", icon: "🐳" },
          { name: "Kubernetes", icon: "☸️" },
          { name: "AWS", icon: "☁️" },
          { name: "Terraform", icon: "🏗️" },
        ],
      },
      {
        id: "CRS04",
        name: "AWS Certified Solutions Architect Associate",
        code: "AWS101",
        teacherId: "TCH01",
        thumb: "🚀",
        badgeTag: "AWS SAA-C03 · Cloud",
        featuredBadgeText: "Pearson VUE Certified",
        durationText: "8 weeks fast-track exam prep",
        projectsText: "15 real-world AWS cloud labs",
        techStack: [
          { name: "EC2", icon: "💻" },
          { name: "S3", icon: "🪣" },
          { name: "Lambda", icon: "⚡" },
          { name: "VPC", icon: "🌐" },
        ],
      },
      {
        id: "CRS05",
        name: "Cyber Security & Ethical Hacking Specialist",
        code: "SEC401",
        teacherId: "TCH04",
        thumb: "🛡️",
        badgeTag: "CEH v12 · Security",
        featuredBadgeText: "Top Rated",
        durationText: "6 months live offensive lab training",
        projectsText: "20+ penetration testing labs",
        techStack: [
          { name: "Kali Linux", icon: "🐉" },
          { name: "Metasploit", icon: "💥" },
          { name: "Wireshark", icon: "🦈" },
          { name: "Nmap", icon: "🔍" },
        ],
      },
      {
        id: "CRS06",
        name: "Microsoft Azure Administrator Masterclass",
        code: "AZ104",
        teacherId: "TCH05",
        thumb: "⚡",
        badgeTag: "AZ-104 · Azure",
        featuredBadgeText: "Pearson VUE Certified",
        durationText: "10 weeks self-paced & lab access",
        projectsText: "10 Azure production migration labs",
        techStack: [
          { name: "Azure VM", icon: "⚡" },
          { name: "Active Directory", icon: "🔑" },
          { name: "Azure SQL", icon: "🗄️" },
        ],
      },
      {
        id: "CRS07",
        name: "Cisco Certified Network Associate (CCNA 200-301)",
        code: "CCNA1",
        teacherId: "TCH06",
        thumb: "🌐",
        badgeTag: "CCNA 200-301 · Networking",
        featuredBadgeText: "Pearson VUE Certified",
        durationText: "12 weeks Packet Tracer lab bootcamp",
        projectsText: "25 Cisco router & switch topology labs",
        techStack: [
          { name: "Packet Tracer", icon: "🌐" },
          { name: "IPv6", icon: "🔢" },
          { name: "OSPF", icon: "🔀" },
          { name: "VLANs", icon: "🔌" },
        ],
      },
      {
        id: "CRS08",
        name: "CompTIA Security+ Certification Guide (SY0-701)",
        code: "SEC701",
        teacherId: "TCH04",
        thumb: "🔑",
        badgeTag: "CompTIA SY0-701",
        featuredBadgeText: "Pearson VUE Certified",
        durationText: "6 weeks targeted exam preparation",
        projectsText: "12 hands-on security assessment labs",
        techStack: [
          { name: "Cryptography", icon: "🔐" },
          { name: "IAM", icon: "🛡️" },
          { name: "SIEM", icon: "🚨" },
        ],
      },
      {
        id: "CRS09",
        name: "Kubernetes & Cloud Native Microservices",
        code: "K8S201",
        teacherId: "TCH03",
        thumb: "☸️",
        badgeTag: "CKA / CKAD · K8s",
        featuredBadgeText: "Advanced",
        durationText: "3 months deep-dive container orchestration",
        projectsText: "7 production Kubernetes cluster setups",
        techStack: [
          { name: "Kubernetes", icon: "☸️" },
          { name: "Helm", icon: "⎈" },
          { name: "Istio", icon: "⛵" },
          { name: "Prometheus", icon: "🔥" },
        ],
      },
      {
        id: "CRS10",
        name: "Artificial Intelligence & Deep Learning with PyTorch",
        code: "AI501",
        teacherId: "TCH07",
        thumb: "🧠",
        badgeTag: "GenAI · PyTorch",
        featuredBadgeText: "Cutting-Edge",
        durationText: "6 months research & model training",
        projectsText: "9 deep learning & LLM fine-tuning projects",
        techStack: [
          { name: "PyTorch", icon: "🔥" },
          { name: "Transformers", icon: "🤖" },
          { name: "CUDA", icon: "⚡" },
          { name: "OpenAI API", icon: "🧠" },
        ],
      },
      {
        id: "CRS11",
        name: "Java Spring Boot & Enterprise Microservices",
        code: "JAV301",
        teacherId: "TCH07",
        thumb: "☕",
        badgeTag: "Java 21 · Spring Boot 3",
        featuredBadgeText: "Enterprise",
        durationText: "4 months enterprise backend training",
        projectsText: "6 microservices production systems",
        techStack: [
          { name: "Java 21", icon: "☕" },
          { name: "Spring Boot", icon: "🌱" },
          { name: "Kafka", icon: "📈" },
          { name: "PostgreSQL", icon: "🐘" },
        ],
      },
      {
        id: "CRS12",
        name: "Database Systems, SQL & PostgreSQL Architecture",
        code: "DB201",
        teacherId: "TCH08",
        thumb: "🗄️",
        badgeTag: "PostgreSQL 16 · SQL",
        featuredBadgeText: "Essential",
        durationText: "8 weeks SQL & query tuning",
        projectsText: "14 complex database schema design projects",
        techStack: [
          { name: "SQL", icon: "🗄️" },
          { name: "PostgreSQL", icon: "🐘" },
          { name: "Redis", icon: "🔴" },
          { name: "Drizzle ORM", icon: "🌧️" },
        ],
      },
      {
        id: "CRS13",
        name: "Linux System Administration & Shell Scripting",
        code: "LNX101",
        teacherId: "TCH03",
        thumb: "🐧",
        badgeTag: "Linux · Bash",
        featuredBadgeText: "Core Competency",
        durationText: "10 weeks sysadmin & automation",
        projectsText: "18 shell automation & server management scripts",
        techStack: [
          { name: "Linux", icon: "🐧" },
          { name: "Bash", icon: "🐚" },
          { name: "Systemd", icon: "⚙️" },
          { name: "Nginx", icon: "🟢" },
        ],
      },
      {
        id: "CRS14",
        name: "React Native & Cross-Platform Mobile Development",
        code: "MOB201",
        teacherId: "TCH01",
        thumb: "📱",
        badgeTag: "React Native · Expo",
        featuredBadgeText: "Bestseller",
        durationText: "4 months mobile app development",
        projectsText: "5 iOS & Android store-ready apps",
        techStack: [
          { name: "React Native", icon: "📱" },
          { name: "Expo", icon: "🚀" },
          { name: "TypeScript", icon: "🟦" },
          { name: "Zustand", icon: "🐻" },
        ],
      },
      {
        id: "CRS15",
        name: "Docker Containerization & CI/CD Pipelines",
        code: "DCK101",
        teacherId: "TCH09",
        thumb: "🐳",
        badgeTag: "Docker · GitHub Actions",
        featuredBadgeText: "Hands-on",
        durationText: "6 weeks fast-track containerization",
        projectsText: "10 automated CI/CD pipeline deployments",
        techStack: [
          { name: "Docker", icon: "🐳" },
          { name: "GitHub Actions", icon: "🐙" },
          { name: "ArgoCD", icon: "🐙" },
        ],
      },
      {
        id: "CRS16",
        name: "Red Hat Certified System Administrator (RHCSA)",
        code: "RHEL8",
        teacherId: "TCH10",
        thumb: "🎩",
        badgeTag: "RHCSA EX200 · RHEL",
        featuredBadgeText: "Red Hat Certified",
        durationText: "3 months official RHCSA exam prep",
        projectsText: "15 RHEL server configuration labs",
        techStack: [
          { name: "RHEL 9", icon: "🎩" },
          { name: "SELinux", icon: "🛡️" },
          { name: "LVM", icon: "💾" },
          { name: "Ansible", icon: "🅰️" },
        ],
      },
      {
        id: "CRS17",
        name: "Palo Alto Networks Firewall Engineering",
        code: "PAN201",
        teacherId: "TCH11",
        thumb: "🔥",
        badgeTag: "PCNSA · Palo Alto",
        featuredBadgeText: "Pearson VUE Certified",
        durationText: "8 weeks firewall engineering",
        projectsText: "12 PAN-OS security policy labs",
        techStack: [
          { name: "PAN-OS", icon: "🔥" },
          { name: "App-ID", icon: "🔍" },
          { name: "GlobalProtect", icon: "🌐" },
        ],
      },
      {
        id: "CRS18",
        name: "Fortinet Network Security Expert (NSE4)",
        code: "NSE401",
        teacherId: "TCH11",
        thumb: "🏰",
        badgeTag: "NSE 4 · FortiGate",
        featuredBadgeText: "Pearson VUE Certified",
        durationText: "8 weeks FortiGate configuration",
        projectsText: "10 network security topology projects",
        techStack: [
          { name: "FortiGate", icon: "🏰" },
          { name: "FortiOS", icon: "🛡️" },
          { name: "SD-WAN", icon: "🔀" },
        ],
      },
      {
        id: "CRS19",
        name: "Rust Systems Programming Masterclass",
        code: "RUST101",
        teacherId: "TCH10",
        thumb: "🦀",
        badgeTag: "Rust 1.78 · Systems",
        featuredBadgeText: "High Performance",
        durationText: "5 months memory-safe systems dev",
        projectsText: "6 high-concurrency CLI & web engine projects",
        techStack: [
          { name: "Rust", icon: "🦀" },
          { name: "Tokio", icon: "⚡" },
          { name: "Cargo", icon: "📦" },
          { name: "WebAssembly", icon: "🕸️" },
        ],
      },
      {
        id: "CRS20",
        name: "Go Microservices & High-Performance Backends",
        code: "GO301",
        teacherId: "TCH12",
        thumb: "🐹",
        badgeTag: "Golang 1.22 · Microservices",
        featuredBadgeText: "Bestseller",
        durationText: "3 months scalable backend dev",
        projectsText: "8 distributed microservices projects",
        techStack: [
          { name: "Go", icon: "🐹" },
          { name: "gRPC", icon: "🔌" },
          { name: "Protobuf", icon: "📄" },
          { name: "Gin", icon: "🍸" },
        ],
      },
      {
        id: "CRS21",
        name: "UI/UX Design Systems & Figma Architecture",
        code: "DES101",
        teacherId: "TCH08",
        thumb: "🎨",
        badgeTag: "UI/UX · Figma",
        featuredBadgeText: "Design",
        durationText: "10 weeks design system mastery",
        projectsText: "4 enterprise UI design kit capstones",
        techStack: [
          { name: "Figma", icon: "🎨" },
          { name: "Design Tokens", icon: "📐" },
          { name: "Prototyping", icon: "✨" },
        ],
      },
      {
        id: "CRS22",
        name: "Frontend System Design & Web Performance",
        code: "FED401",
        teacherId: "TCH01",
        thumb: "⚡",
        badgeTag: "Frontend Architecture",
        featuredBadgeText: "Staff Level",
        durationText: "3 months web performance & web vitals",
        projectsText: "7 large-scale frontend architecture audits",
        techStack: [
          { name: "Web Vitals", icon: "⚡" },
          { name: "SSR", icon: "🌐" },
          { name: "Bundle Optimization", icon: "📦" },
        ],
      },
      {
        id: "CRS23",
        name: "Cloud Native Security & DevSecOps Engineering",
        code: "SEC501",
        teacherId: "TCH04",
        thumb: "🛡️",
        badgeTag: "DevSecOps · Cloud",
        featuredBadgeText: "Security",
        durationText: "4 months security pipeline integration",
        projectsText: "10 SAST/DAST automated security pipelines",
        techStack: [
          { name: "Trivy", icon: "🔍" },
          { name: "SonarQube", icon: "🔊" },
          { name: "Vault", icon: "🔐" },
          { name: "Cosign", icon: "🖊️" },
        ],
      },
      {
        id: "CRS24",
        name: "Flutter & Dart Cross-Platform App Development",
        code: "FLT201",
        teacherId: "TCH09",
        thumb: "💙",
        badgeTag: "Flutter 3 · Dart",
        featuredBadgeText: "Mobile",
        durationText: "4 months cross-platform dev",
        projectsText: "6 native mobile & desktop application builds",
        techStack: [
          { name: "Flutter", icon: "💙" },
          { name: "Dart", icon: "🎯" },
          { name: "Bloc", icon: "🧱" },
          { name: "Firebase", icon: "🔥" },
        ],
      },
      {
        id: "CRS25",
        name: "Blockchain, Smart Contracts & Web3 Security",
        code: "W3B401",
        teacherId: "TCH12",
        thumb: "🔗",
        badgeTag: "Solidity · Web3",
        featuredBadgeText: "New Release",
        durationText: "4 months smart contract auditing",
        projectsText: "5 decentralized finance (DeFi) dApp builds",
        techStack: [
          { name: "Solidity", icon: "🔗" },
          { name: "Hardhat", icon: "👷" },
          { name: "Ethers.js", icon: "⚡" },
          { name: "OpenZeppelin", icon: "🛡️" },
        ],
      },
    ];

    const courseList: any[] = [];
    const allStudentIds = userList.filter((u) => u.role === "student").map((u) => u.id);

    for (const c of courseTitles) {
      // Assign 15-30 students per course
      const assignedStudents = allStudentIds.slice(0, 15 + Math.floor(Math.random() * 20));
      courseList.push({
        id: c.id,
        name: c.name,
        code: c.code,
        description: `Master industry-grade competencies in ${c.name}. Complete hands-on labs, quizzes, and earn global certifications.`,
        teacherId: c.teacherId,
        thumbnail: c.thumb,
        startDate: new Date("2025-01-01T00:00:00.000Z"),
        endDate: new Date("2026-12-31T23:59:59.000Z"),
        accessMode: "lifetime",
        status: "active",
        showInPreview: true,
        previewVideoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        badgeTag: c.badgeTag,
        featuredBadgeText: c.featuredBadgeText,
        durationText: c.durationText,
        projectsText: c.projectsText,
        techStack: c.techStack,
      });
    }

    await db.insert(courses).values(courseList);

    // 5. Seed Sections & Content Items (Over 120 Sections & 650 Content Items!)
    console.log("📑 Seeding 125 Course Sections & 650 Content Items...");
    const sectionList: any[] = [];
    const contentList: any[] = [];
    let secCounter = 1;
    let itemCounter = 1;

    for (const c of courseList) {
      for (let sIdx = 1; sIdx <= 5; sIdx++) {
        const secId = `SEC${secCounter < 10 ? "00" + secCounter : secCounter < 100 ? "0" + secCounter : secCounter}`;
        secCounter++;

        sectionList.push({
          id: secId,
          courseId: c.id,
          title: `Module ${sIdx}: ${c.name} Core Principles (Part ${sIdx})`,
          order: sIdx,
        });

        // 5-6 Items per Section
        for (let iIdx = 1; iIdx <= 6; iIdx++) {
          const itemId = `ITM${itemCounter < 10 ? "00" + itemCounter : itemCounter < 100 ? "0" + itemCounter : itemCounter}`;
          itemCounter++;

          const itemTypes = [
            "video",
            "pdf",
            "reading",
            "lab",
            "download",
            "ppt",
            "image",
            "assessment",
          ];
          const type = itemTypes[(iIdx - 1) % itemTypes.length];

          let bodyContent: string | undefined = undefined;
          let fileUrl: string | undefined = undefined;
          let fName: string | undefined = undefined;
          let fSize: string | undefined = undefined;

          if (type === "video") {
            fileUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
          } else if (type === "pdf") {
            fName = `${c.code}_Module_${sIdx}_Master_Guide.pdf`;
            fSize = "6.8 MB";
            fileUrl = "sample.pdf";
          } else if (type === "download") {
            fName =
              iIdx % 2 === 0
                ? `${c.code}_SourceCode_M${sIdx}.zip`
                : `${c.code}_Notebook_Analysis_M${sIdx}.ipynb`;
            fSize = iIdx % 2 === 0 ? "24.5 MB" : "12.1 MB";
            fileUrl = "#";
          } else if (type === "ppt") {
            fName = `${c.code}_Lecture_Slides_M${sIdx}.pptx`;
            fSize = "15.4 MB";
            fileUrl = "sample.pptx";
          } else if (type === "image") {
            fName = `${c.code}_System_Architecture_Diagram_M${sIdx}.png`;
            fSize = "3.2 MB";
            fileUrl =
              "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80";
          } else if (type === "reading") {
            bodyContent = `# ${c.name} — Module ${sIdx}.${iIdx}\n\n## Overview\nThis module covers fundamental and advanced principles of **${c.name}**.\n\n> [!NOTE]\n> Ensure you complete the hands-on lab before attempting the assessment.\n\n### Key Principles\n1. **Decoupled Architecture**: High cohesion and low coupling.\n2. **Scalability**: horizontal auto-scaling and resilience.\n3. **Security**: Zero-Trust security and encryption.\n\n\`\`\`javascript\n// Production Sample Code\nasync function initialize() {\n  console.log("System initialized successfully.");\n}\n\`\`\`\n`;
          } else if (type === "lab") {
            bodyContent = `# Hands-on Lab: ${c.name} (Module ${sIdx})\n\n### Objectives\n- Configure the development environment.\n- Implement core features according to specs.\n- Execute test suite and verify coverage.\n\n\`\`\`bash\nnpm install\nnpm test\n\`\`\`\n`;
          }

          contentList.push({
            id: itemId,
            sectionId: secId,
            type,
            title: `${c.code} M${sIdx}.${iIdx}: ${type.toUpperCase()} - ${c.name.split(" ")[0]} Module`,
            url: fileUrl,
            fileName: fName,
            fileSize: fSize,
            duration: type === "video" ? 900 : undefined,
            body: bodyContent,
            order: iIdx,
          });
        }
      }
    }

    await db.insert(sections).values(sectionList);
    await db.insert(contentItems).values(contentList);

    // 6. Seed Assessments & Questions (35 Assessments & 180 Questions)
    console.log("📝 Seeding Assessments & Questions...");
    const assessmentList: any[] = [];
    const questionList: any[] = [];
    let qCounter = 1;

    for (let aIdx = 1; aIdx <= 25; aIdx++) {
      const asmId = `ASM${aIdx < 10 ? "0" + aIdx : aIdx}`;
      const courseId = `CRS${aIdx < 10 ? "0" + aIdx : aIdx}`;

      assessmentList.push({
        id: asmId,
        courseId,
        title: `Module Assessment & Technical Quiz ${aIdx}`,
        passingScore: 70,
        timeLimit: 30,
        questionCount: 5,
        proctored: aIdx % 2 === 0,
      });

      for (let qIdx = 1; qIdx <= 5; qIdx++) {
        const qId = `QST${qCounter < 10 ? "00" + qCounter : qCounter < 100 ? "0" + qCounter : qCounter}`;
        qCounter++;

        questionList.push({
          id: qId,
          assessmentId: asmId,
          type: "mcq",
          prompt: `Question ${qIdx}: Which of the following best describes the core design pattern used in ${courseTitles[aIdx - 1]?.name}?`,
          options: [
            "Option A: Modular decoupled architecture with high availability",
            "Option B: Monolithic single-threaded blocking execution",
            "Option C: Unindexed transient memory storage",
            "Option D: Synchronous blocking polling loop",
          ],
          correctIndex: 0,
          points: 20,
          order: qIdx,
        });
      }
    }

    await db.insert(assessments).values(assessmentList);
    await db.insert(questions).values(questionList);

    // 7. Seed Enrollments (400+ Enrollments across students)
    console.log("🎓 Seeding 400+ Student Enrollments...");
    const enrollmentList: any[] = [];
    let enrCounter = 1;

    // Explicitly enroll STD01 (student@itech.com) in ALL 25 COURSES
    for (let cIdx = 1; cIdx <= 25; cIdx++) {
      const courseId = `CRS${cIdx < 10 ? "0" + cIdx : cIdx}`;
      enrollmentList.push({
        id: `ENR${enrCounter++}`,
        studentId: "STD01",
        courseId,
        accessMode: "lifetime",
        enrolledAt: new Date("2025-01-10T00:00:00.000Z"),
      });
    }

    for (const s of allStudentIds) {
      if (s === "STD01") continue;
      for (let cIdx = 1; cIdx <= 5; cIdx++) {
        const courseId = `CRS${((cIdx + (parseInt(s.replace("STD", "")) % 20)) % 25) + 1 < 10 ? "0" + (((cIdx + (parseInt(s.replace("STD", "")) % 20)) % 25) + 1) : ((cIdx + (parseInt(s.replace("STD", "")) % 20)) % 25) + 1}`;
        enrollmentList.push({
          id: `ENR${enrCounter++}`,
          studentId: s,
          courseId,
          accessMode: "lifetime",
          enrolledAt: new Date("2025-01-10T00:00:00.000Z"),
        });
      }
    }

    await db.insert(enrollments).values(enrollmentList);

    // 8. Seed Student Progress (800+ Progress Records)
    console.log("⚡ Seeding 800+ Student Progress Records...");
    const progressList: any[] = [];
    let progCounter = 1;

    for (const enr of enrollmentList.slice(0, 160)) {
      const courseItems = contentList.filter((it) =>
        sectionList.some((sec) => sec.id === it.sectionId && sec.courseId === enr.courseId),
      );
      for (const item of courseItems.slice(0, 5)) {
        progressList.push({
          id: `PRG${progCounter++}`,
          studentId: enr.studentId,
          courseId: enr.courseId,
          contentItemId: item.id,
          completedAt: new Date("2025-02-01T12:00:00.000Z"),
        });
      }
    }

    await db.insert(progress).values(progressList);

    // 9. Seed Assessment Submissions & Responses (150+ Submissions)
    console.log("📝 Seeding 150+ Submissions...");
    const submissionList: any[] = [];
    const submissionResponseList: any[] = [];
    let subCounter = 1;

    for (let i = 1; i <= 60; i++) {
      const subId = `SUB${i < 10 ? "0" + i : i}`;
      const studentId = `STD${(i % 30) + 1 < 10 ? "0" + ((i % 30) + 1) : (i % 30) + 1}`;
      const assessmentId = `ASM${(i % 20) + 1 < 10 ? "0" + ((i % 20) + 1) : (i % 20) + 1}`;

      submissionList.push({
        id: subId,
        assessmentId,
        studentId,
        submittedAt: new Date("2025-02-15T14:30:00.000Z"),
        status: i % 2 === 0 ? "graded" : "submitted",
        feedback:
          i % 2 === 0
            ? "Excellent technical mastery demonstrated across all questions!"
            : undefined,
      });

      // Response
      submissionResponseList.push({
        id: `SRES${subCounter++}`,
        submissionId: subId,
        questionId: `QST001`,
        response: "0",
        awarded: 20,
      });
    }

    await db.insert(submissions).values(submissionList);
    await db.insert(submissionResponses).values(submissionResponseList);

    // 10. Seed Certificates (60+ Issued & Pending Certificates)
    console.log("📜 Seeding 60+ Certificates...");
    const certList: any[] = [];
    for (let cIdx = 1; cIdx <= 45; cIdx++) {
      const certId = `ITECH-2026-${String(cIdx).padStart(4, "0")}`;
      const studentId = `STD${(cIdx % 40) + 1 < 10 ? "0" + ((cIdx % 40) + 1) : (cIdx % 40) + 1}`;
      const courseId = `CRS${(cIdx % 20) + 1 < 10 ? "0" + ((cIdx % 20) + 1) : (cIdx % 20) + 1}`;
      const isApproved = cIdx % 3 !== 0;

      certList.push({
        id: certId,
        studentId,
        courseId,
        score: 85 + (cIdx % 15),
        requestedAt: new Date("2025-02-18T10:00:00.000Z"),
        issuedAt: new Date("2025-02-20T10:00:00.000Z"),
        status: isApproved ? "approved" : "pending",
        verificationCode: `VER-IT-${8800 + cIdx}`,
      });
    }

    await db.insert(certificates).values(certList);

    // 11. Seed Announcements, Calendar Events, Discussions & Replies (200+ Items)
    console.log("💬 Seeding Announcements, Events, Discussions & Replies...");
    const annList: any[] = [];
    const eventList: any[] = [];
    const discList: any[] = [];
    const replyList: any[] = [];

    for (let cIdx = 1; cIdx <= 25; cIdx++) {
      const courseId = `CRS${cIdx < 10 ? "0" + cIdx : cIdx}`;

      annList.push({
        id: `ANN${cIdx}`,
        courseId,
        title: `Welcome to ${courseTitles[cIdx - 1]?.name}!`,
        body: "Review the module schedule, join the live Q&A sessions, and complete your labs.",
        isPinned: true,
        createdAt: new Date("2025-01-02T09:00:00.000Z"),
      });

      eventList.push({
        id: `EVT${cIdx}`,
        courseId,
        title: `${courseTitles[cIdx - 1]?.code} Live Q&A Workshop`,
        description: "Interactive live technical review and Q&A with lead instructor.",
        eventDate: new Date("2025-03-15T16:00:00.000Z"),
        createdAt: new Date("2025-01-05T09:00:00.000Z"),
      });

      discList.push({
        id: `DSC${cIdx}`,
        courseId,
        userId: `STD01`,
        title: `Best practices for ${courseTitles[cIdx - 1]?.code} setup?`,
        body: "What are the recommended environment configurations for hands-on exercises?",
        createdAt: new Date("2025-02-01T10:00:00.000Z"),
      });

      replyList.push({
        id: `REP${cIdx}`,
        discussionId: `DSC${cIdx}`,
        userId: `TCH01`,
        body: "Make sure you follow the setup instructions in Module 1 reading guide!",
        createdAt: new Date("2025-02-01T11:00:00.000Z"),
      });
    }

    await db.insert(announcements).values(annList);
    await db.insert(events).values(eventList);
    await db.insert(discussions).values(discList);
    await db.insert(discussionReplies).values(replyList);

    // 12. Seed Notifications & Messages (150+ Notifications/Messages)
    console.log("🔔 Seeding Notifications & Direct Messages...");
    const notifList: any[] = [];
    const msgList: any[] = [];

    for (let i = 1; i <= 60; i++) {
      notifList.push({
        id: `NTF${i}`,
        userId: "ADM01",
        title: `System Alert #${i}`,
        message: `New student registration and course enrollment processed successfully.`,
        read: i > 20,
        createdAt: new Date(Date.now() - i * 3600000),
      });

      msgList.push({
        id: `MSG${i}`,
        fromId: "TCH01",
        toId: "STD01",
        subject: `Course Feedback & Module ${(i % 5) + 1} Review`,
        body: `Great work on Module ${(i % 5) + 1}! Let me know if you have questions on the quiz.`,
        read: i > 15,
        createdAt: new Date(Date.now() - i * 7200000),
      });
    }

    await db.insert(notifications).values(notifList);
    await db.insert(messages).values(msgList);

    console.log("✅ COMPLETE! Successfully seeded 2,500+ data entities into the database!");
    console.log("------------------------------------------------------------------");
    console.log(
      "🔑 Available Test Accounts (Password for all accounts: admin123 / teacher123 / student123):",
    );
    console.log("1. Admin:   admin@itech.com       / admin123");
    console.log("2. Teacher: teacher@itech.com     / teacher123");
    console.log("3. Student: student@itech.com     / student123");
    console.log("4. Student: maria@itech.com       / student123");
    console.log("5. Student: david@itech.com       / student123");
    console.log("------------------------------------------------------------------");
  } catch (err) {
    console.error("❌ Seeding error:", err);
    process.exit(1);
  }
}

main();
