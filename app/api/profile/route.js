import { auth, currentUser } from "@clerk/nextjs/server";
import { createAdminClient } from "@/app/lib/supabase";
import { NextResponse } from "next/server";

const FREE_LIMIT = 5;

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await currentUser();
  const supabase = createAdminClient();

  // Fetch profile to get check plan in metadata (or from DB)
  // Assuming sync is working, we can query profiles table.
  let { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId) // Assuming id is the PK and matches Clerk ID
    .single();

  if (!profile) {
    // 🛠️ LAZY SYNC: Profile missing? Create it now.
    // This handles local dev where webhooks don't fire.
    console.log(`Lazy Sync: Creating profile for ${userId}`);
    
    const email = user.emailAddresses[0]?.emailAddress;
    const name = user.fullName || user.username || "User";
    
    const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
            id: userId,
            email: email,
            full_name: name,
            avatar_url: user.imageUrl,
            plan: 'free'
        })
        .select()
        .single();
        
    if (createError) {
        console.error("Lazy Sync Failed:", createError);
        return NextResponse.json({ error: "Failed to sync profile" }, { status: 500 });
    }
    
    // Also init usage meter
    await supabase.from('usage_meters').insert({
        user_id: userId,
        period_day: new Date().toISOString().split("T")[0],
        scan_count: 0,
        readme_count: 0
    });
    
    profile = newProfile;
  }

  const plan = profile.plan || "free";
  
  // Check usage
  const today = new Date().toISOString().split("T")[0];
  const { data: usage } = await supabase
    .from('usage_meters')
    .select('scan_count')
    .eq('user_id', userId)
    .eq('period_day', today)
    .single();

  const used = usage?.scan_count || 0;

  // Reset timer
  const now = new Date();
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  const resetInHours = Math.ceil((endOfDay.getTime() - now.getTime()) / 1000 / 60 / 60);

  return NextResponse.json({
    user: {
      username: profile.username || user.username,
      avatar: profile.avatar_url || user.imageUrl,
      email: profile.email || user.emailAddresses[0]?.emailAddress,
    },
    plan: plan,
    used: used,
    limit: FREE_LIMIT, // This should ideally come from plan config, but keeping legacy const for now
    resetInHours,
  });
}
