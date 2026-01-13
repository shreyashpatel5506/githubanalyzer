import connectMongo from "@/app/config/db";
import User from "@/app/models/user";
import NextAuth from "next-auth";
import GithubProvider from "next-auth/providers/github";

export const authOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
      authorization: {
        params: {
          scope: "read:user user:email repo",
        },
      },
    }),
  ],

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      await connectMongo();

      let dbUser = await User.findOne({ githubId: profile.id });

      if (!dbUser) {
        dbUser = await User.create({
          githubId: profile.id,
          username: profile.login,
          avatar: profile.avatar_url,
          email: profile.email,
          plan: "free",
        });
      }

      dbUser.lastLogin = new Date();
      await dbUser.save();

      return true;
    },

    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.githubId = profile.id;
        token.username = profile.login;
        token.accessToken = account.access_token; // 🔥 IMPORTANT
      }
      return token;
    },

    async session({ session, token }) {
      session.user.githubId = token.githubId;
      session.user.username = token.username;
      session.accessToken = token.accessToken;
      return session;
    },
  },
};
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
