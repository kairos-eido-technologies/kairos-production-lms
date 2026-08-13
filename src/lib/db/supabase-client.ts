import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://pzmtbnsquhlplakcaezl.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bXRibnNxdWhscGxha2NhZXpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1NjAxNzYsImV4cCI6MjEwMjEzNjE3Nn0.ENqDZPXBDuS2FtRJt2Z6pLMHjVm1tqRMDKm-Y1EkM5w";

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  },
});
