import { createClient } from "@/lib/supabase/server";

export async function getSupabase() {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
        throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_URL or env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    }
    const supabase = await createClient();
    return supabase;
}

