import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      authorization: { params: { scope: "identify email" } },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    jwt({ token, profile }) {
      if (profile?.id) token.discordId = profile.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && typeof token.discordId === "string") {
        session.user.discordId = token.discordId;
      }
      return session;
    },
  },
});

declare module "next-auth" {
  interface User {
    discordId?: string;
  }

  interface Session {
    user: User & {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      discordId?: string;
    };
  }
}

