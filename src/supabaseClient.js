import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;
console.log("URL =>", import.meta.env.VITE_SUPABASE_URL)
console.log("KEY =>", import.meta.env.VITE_SUPABASE_KEY)
if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase config, check .env file");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
