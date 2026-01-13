import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import connectMongo from "@/app/config/db";
import User from "@/app/models/user";
import Usage from "@/app/models/Usage";
import { NextResponse } from "next/server";

const FREE_LIMIT = 5;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectMongo();

  const user = await User.findOne({ githubId: session.user.githubId });

  const today = new Date().toISOString().split("T")[0];

  const usage = (await Usage.findOne({ userId: user._id, date: today })) || {
    repoScansUsed: 0,
  };

  // Reset timer
  const now = new Date();
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  const resetInHours = Math.ceil((endOfDay - now) / 1000 / 60 / 60);

  return NextResponse.json({
    user: {
      username: user.username,
      avatar: user.avatar,
      email: user.email,
    },
    plan: user.plan,
    used: usage.repoScansUsed,
    limit: FREE_LIMIT,
    resetInHours,
  });
}
