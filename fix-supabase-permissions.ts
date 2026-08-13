import postgres from "postgres";
import "dotenv/config";

const connStr = "postgresql://postgres:kmHmzt6nClQNyzY7@db.pzmtbnsquhlplakcaezl.supabase.co:5432/postgres";

async function syncFullSchema() {
  console.log("🚀 Syncing FULL Drizzle schema to Supabase PostgreSQL...");
  const sql = postgres(connStr, { ssl: "require", prepare: false, connect_timeout: 10 });

  try {
    // 1. Create tables if not exists
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS public."users" (
        "id" text PRIMARY KEY,
        "name" text NOT NULL,
        "email" varchar(255) NOT NULL UNIQUE,
        "password_hash" text NOT NULL,
        "role" varchar(50) NOT NULL DEFAULT 'student',
        "group_name" varchar(100),
        "avatar" text,
        "status" varchar(50) NOT NULL DEFAULT 'active',
        "joined_at" timestamp NOT NULL DEFAULT now(),
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        "last_active" timestamp,
        "is_email_verified" boolean NOT NULL DEFAULT false,
        "email_verification_code" varchar(6),
        "phone" varchar(20),
        "reset_password_code" varchar(6)
      );

      CREATE TABLE IF NOT EXISTS public."courses" (
        "id" text PRIMARY KEY,
        "name" text NOT NULL,
        "code" varchar(50) NOT NULL UNIQUE,
        "description" text,
        "teacher_id" text REFERENCES public."users"("id"),
        "thumbnail" text,
        "start_date" timestamp NOT NULL,
        "end_date" timestamp NOT NULL,
        "access_mode" varchar(50) NOT NULL DEFAULT 'lifetime',
        "status" varchar(50) NOT NULL DEFAULT 'draft',
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        "show_in_preview" boolean NOT NULL DEFAULT false,
        "preview_video_url" text,
        "badge_tag" text,
        "featured_badge_text" text,
        "duration_text" text,
        "projects_text" text,
        "tech_stack" jsonb
      );

      CREATE TABLE IF NOT EXISTS public."sections" (
        "id" text PRIMARY KEY,
        "course_id" text NOT NULL REFERENCES public."courses"("id") ON DELETE CASCADE,
        "title" text NOT NULL,
        "order" integer NOT NULL DEFAULT 0,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public."content_items" (
        "id" text PRIMARY KEY,
        "section_id" text NOT NULL REFERENCES public."sections"("id") ON DELETE CASCADE,
        "type" varchar(50) NOT NULL,
        "title" text NOT NULL,
        "url" text,
        "body" text,
        "file_name" text,
        "duration" integer,
        "file_size" varchar(50),
        "assessment_id" text,
        "order" integer NOT NULL DEFAULT 0,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public."files" (
        "id" text PRIMARY KEY,
        "filename" text NOT NULL,
        "mime" varchar(255) NOT NULL,
        "size" integer NOT NULL,
        "owner_id" text REFERENCES public."users"("id"),
        "storage_type" varchar(50) NOT NULL DEFAULT 'local',
        "storage_key" text NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public."enrollments" (
        "id" text PRIMARY KEY,
        "student_id" text NOT NULL REFERENCES public."users"("id"),
        "course_id" text NOT NULL REFERENCES public."courses"("id") ON DELETE CASCADE,
        "access_mode" varchar(50) NOT NULL DEFAULT 'lifetime',
        "end_date" timestamp,
        "enrolled_at" timestamp NOT NULL DEFAULT now(),
        "completed_at" timestamp,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public."progress" (
        "id" text PRIMARY KEY,
        "student_id" text NOT NULL REFERENCES public."users"("id"),
        "course_id" text NOT NULL REFERENCES public."courses"("id") ON DELETE CASCADE,
        "content_item_id" text NOT NULL REFERENCES public."content_items"("id"),
        "completed_at" timestamp NOT NULL DEFAULT now(),
        "created_at" timestamp NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public."assessments" (
        "id" text PRIMARY KEY,
        "course_id" text NOT NULL REFERENCES public."courses"("id"),
        "title" text NOT NULL,
        "time_limit" integer NOT NULL,
        "passing_score" integer NOT NULL,
        "attempts" integer NOT NULL DEFAULT 1,
        "question_count" integer NOT NULL,
        "proctored" boolean NOT NULL DEFAULT false,
        "is_final" boolean NOT NULL DEFAULT false,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public."questions" (
        "id" text PRIMARY KEY,
        "assessment_id" text NOT NULL REFERENCES public."assessments"("id") ON DELETE CASCADE,
        "type" varchar(50) NOT NULL,
        "prompt" text NOT NULL,
        "options" jsonb,
        "correct_index" integer,
        "points" integer NOT NULL DEFAULT 1,
        "image_url" text,
        "order" integer NOT NULL DEFAULT 0,
        "created_at" timestamp NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public."submissions" (
        "id" text PRIMARY KEY,
        "assessment_id" text NOT NULL REFERENCES public."assessments"("id"),
        "student_id" text NOT NULL REFERENCES public."users"("id"),
        "submitted_at" timestamp NOT NULL,
        "status" varchar(50) NOT NULL DEFAULT 'submitted',
        "feedback" text,
        "proctor_events" jsonb,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public."submission_responses" (
        "id" text PRIMARY KEY,
        "submission_id" text NOT NULL,
        "question_id" text NOT NULL REFERENCES public."questions"("id"),
        "response" text NOT NULL,
        "awarded" integer,
        "created_at" timestamp NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public."certificates" (
        "id" text PRIMARY KEY,
        "student_id" text NOT NULL REFERENCES public."users"("id"),
        "course_id" text NOT NULL REFERENCES public."courses"("id"),
        "score" integer NOT NULL,
        "status" varchar(50) NOT NULL DEFAULT 'pending',
        "requested_at" timestamp NOT NULL,
        "issued_at" timestamp,
        "teacher_note" text,
        "rejection_reason" text,
        "proctor_log" jsonb,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public."notifications" (
        "id" text PRIMARY KEY,
        "user_id" text NOT NULL REFERENCES public."users"("id"),
        "title" text NOT NULL,
        "message" text NOT NULL,
        "read" boolean NOT NULL DEFAULT false,
        "link" text,
        "created_at" timestamp NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public."messages" (
        "id" text PRIMARY KEY,
        "from_id" text NOT NULL REFERENCES public."users"("id"),
        "to_id" text NOT NULL REFERENCES public."users"("id"),
        "subject" text NOT NULL,
        "body" text NOT NULL,
        "read" boolean NOT NULL DEFAULT false,
        "created_at" timestamp NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public."events" (
        "id" text PRIMARY KEY,
        "course_id" text REFERENCES public."courses"("id") ON DELETE CASCADE,
        "title" text NOT NULL,
        "description" text,
        "event_date" timestamp NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public."announcements" (
        "id" text PRIMARY KEY,
        "course_id" text NOT NULL REFERENCES public."courses"("id") ON DELETE CASCADE,
        "title" text NOT NULL,
        "body" text NOT NULL,
        "is_pinned" boolean NOT NULL DEFAULT false,
        "created_at" timestamp NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public."discussions" (
        "id" text PRIMARY KEY,
        "course_id" text NOT NULL REFERENCES public."courses"("id") ON DELETE CASCADE,
        "user_id" text NOT NULL REFERENCES public."users"("id") ON DELETE CASCADE,
        "title" text NOT NULL,
        "body" text NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public."discussion_replies" (
        "id" text PRIMARY KEY,
        "discussion_id" text NOT NULL REFERENCES public."discussions"("id") ON DELETE CASCADE,
        "user_id" text NOT NULL REFERENCES public."users"("id") ON DELETE CASCADE,
        "body" text NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public."video_checkpoints" (
        "id" text PRIMARY KEY,
        "content_item_id" text NOT NULL REFERENCES public."content_items"("id") ON DELETE CASCADE,
        "timestamp" integer NOT NULL,
        "type" varchar(50) NOT NULL,
        "prompt" text NOT NULL,
        "options" jsonb,
        "correct_index" integer,
        "correct_text" text,
        "created_at" timestamp NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public."checkpoint_progress" (
        "id" text PRIMARY KEY,
        "student_id" text NOT NULL REFERENCES public."users"("id") ON DELETE CASCADE,
        "checkpoint_id" text NOT NULL REFERENCES public."video_checkpoints"("id") ON DELETE CASCADE,
        "is_correct" boolean NOT NULL DEFAULT false,
        "answered_at" timestamp NOT NULL DEFAULT now()
      );
    `);
    console.log("✅ All 20 PostgreSQL tables created/verified on Supabase!");

    // 2. Grant permissions and disable RLS for direct API access
    await sql.unsafe(`
      GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
      GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
    `);

    const allTables = [
      "users", "courses", "sections", "content_items", "files", "enrollments", "progress",
      "questions", "assessments", "submissions", "submission_responses", "certificates",
      "notifications", "messages", "events", "announcements", "discussions", "discussion_replies",
      "video_checkpoints", "checkpoint_progress"
    ];

    for (const t of allTables) {
      await sql.unsafe(`ALTER TABLE public."${t}" DISABLE ROW LEVEL SECURITY;`);
      await sql.unsafe(`GRANT ALL ON TABLE public."${t}" TO anon, authenticated, service_role, postgres;`);
    }

    console.log("🎉 ALL 20 Supabase PostgreSQL tables created and permissions granted!");
  } catch (err: any) {
    console.error("❌ Schema sync error:", err);
  } finally {
    await sql.end();
  }
}

syncFullSchema();
