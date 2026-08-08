# iTech Academy LMS

A state-of-the-art Learning Management System (LMS) built with TanStack Start, React, Drizzle ORM, and PostgreSQL. It features three roles (Admin, Teacher, Student) with dashboard analytics, course creation pipelines, final exams with activity-tracking proctoring, and automated certificate generation.

---

## 🚀 Tech Stack
* **Framework**: [TanStack Start](https://tanstack.com/router/latest/docs/start/overview) (Vite + React + Vinxi server)
* **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
* **Database**: PostgreSQL
* **Styling**: Tailwind CSS v4 & custom HSL dark mode palettes

---

## 🛠️ Prerequisites
* **Node.js**: v18.x or higher
* **PostgreSQL**: Running locally or on a remote instance

---

## 📦 Getting Started

### 1. Install Dependencies
Clone the repository and run:
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` in the root folder:
```bash
cp .env.example .env
```
Open `.env` and configure your credentials:
```env
# Database connection string
DATABASE_URL=postgresql://postgres:password@localhost:5432/itech_lms

# JWT Secret for session tokens
JWT_SECRET=your-secret-key-change-in-production

# Node environment
NODE_ENV=development

# SMTP settings (optional for verification emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="iTech Academy" <your-email@gmail.com>
```

### 3. Initialize & Sync Database Schema
Push the Drizzle schema definitions to your local PostgreSQL instance:
```bash
npm run db:push
```

### 4. Seed the Admin User
Run the seed script to wipe the database clean and seed only the single administrator account:
```bash
npm run db:seed
```

---

## 🔑 Default Credentials

Logging in as Administrator:
* **Email**: `admin@itech.com`
* **Password**: `admin123`

---

## 💻 Running the Project

Start the development server:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.
