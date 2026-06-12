import { createClient } from "@supabase/supabase-js";
export const createAdminClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
        throw new Error("Supabase environment variables are missing. Please check your .env file.");
    }
    return createClient(supabaseUrl, supabaseKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
};
