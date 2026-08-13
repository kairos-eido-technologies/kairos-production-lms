import { supabase } from "./src/lib/db/supabase-client";

async function seedSupabase() {
  console.log("🌱 Seeding Supabase PostgreSQL with initial Admin, Teacher, and sample courses...");

  const adminUser = {
    id: "ADM01",
    name: "Administrator",
    email: "admin@itech.com",
    password_hash: "$2a$10$wE47pP5k7V5Y0d0Xy9Jz7u8mYx4k4W0G3eX0eX0eX0eX0eX0eX0e",
    role: "admin",
    status: "active",
    is_email_verified: true,
    joined_at: new Date().toISOString(),
  };

  const teacherUser = {
    id: "TCH01",
    name: "Dr. Sarah Jenkins",
    email: "sarah.jenkins@itech.com",
    password_hash: "$2a$10$wE47pP5k7V5Y0d0Xy9Jz7u8mYx4k4W0G3eX0eX0eX0eX0eX0eX0e",
    role: "teacher",
    status: "active",
    is_email_verified: true,
    joined_at: new Date().toISOString(),
  };

  const { error: err1 } = await supabase.from("users").upsert([adminUser, teacherUser], { onConflict: "id" });
  if (err1) console.error("Error upserting seed users:", err1);
  else console.log("✅ Seed users (Admin & Teacher) upserted into Supabase!");

  const sampleCourse = {
    id: "CS-401",
    name: "Full-Stack Web Development Mastery",
    code: "CS-401",
    description: "Master modern web development using HTML, JavaScript, Next.js, React, and Supabase cloud backend architecture.",
    teacher_id: "TCH01",
    thumbnail: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80",
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 90 * 86400000).toISOString(),
    access_mode: "lifetime",
    status: "active",
    show_in_preview: true,
  };

  const { error: err2 } = await supabase.from("courses").upsert([sampleCourse], { onConflict: "id" });
  if (err2) console.error("Error upserting seed course:", err2);
  else console.log("✅ Sample course upserted into Supabase!");

  console.log("🎉 Supabase database seeding complete!");
}

seedSupabase();
