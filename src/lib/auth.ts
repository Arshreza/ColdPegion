import NextAuth, { type NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { routeNewUserToOrg } from "@/lib/org-routing";

// Build the provider list from whatever is configured so a missing OAuth app
// doesn't crash the whole auth system.
const providers: NextAuthConfig["providers"] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // DELIBERATE: Google verifies email ownership, so auto-linking a
      // credentials account sharing the same email is acceptable for UX.
      // Trade-off: a credentials user with an *unverified* email could be
      // claimed by an OAuth login on the same address.
      allowDangerousEmailAccountLinking: true,
    })
  );
}

if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
  const tenant = process.env.MICROSOFT_TENANT_ID || "common";
  providers.push(
    MicrosoftEntraID({
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      issuer: `https://login.microsoftonline.com/${tenant}/v2.0`,
      // DELIBERATE: Same rationale as Google — see comment above.
      allowDangerousEmailAccountLinking: true,
    })
  );
}

providers.push(
  CredentialsProvider({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null;
      const user = await db.user.findUnique({ where: { email: credentials.email as string } });
      if (!user || !user.passwordHash) return null;
      const isPasswordValid = await compare(credentials.password as string, user.passwordHash);
      if (!isPasswordValid) return null;
      return { id: user.id, email: user.email, name: user.name, image: user.image };
    },
  })
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  // Honor the deployment host (behind proxies / on managed platforms).
  trustHost: true,
  pages: {
    signIn: "/login",
    newUser: "/register",
  },
  providers,
  events: {
    // OAuth (Google/Microsoft) users are created by the adapter — assign them to
    // an organization (invite > work-domain join > new org) and seed settings.
    async createUser({ user }) {
      if (!user.id || !user.email) return;
      try {
        await routeNewUserToOrg({ id: user.id, email: user.email, name: user.name });
      } catch (e) {
        console.error("[auth] org routing failed for new user:", (e as Error).message);
      }
      await db.globalSettings.create({ data: { userId: user.id } }).catch(() => {});
    },
  },
  callbacks: {
    async session({ token, session }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name;
        session.user.email = token.email!;
        session.user.image = token.picture;
        session.user.organizationId = (token.organizationId as string) ?? null;
        session.user.role = (token.role as string) ?? "OWNER";
        session.user.memberStatus = (token.memberStatus as string) ?? "ACTIVE";
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      const lookupEmail = token.email;
      if (!token.id && lookupEmail) {
        const dbUser = await db.user.findUnique({ where: { email: lookupEmail } });
        if (dbUser) token.id = dbUser.id;
      }
      if (token.id) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { organizationId: true, role: true, memberStatus: true },
        });
        if (dbUser) {
          token.organizationId = dbUser.organizationId;
          token.role = dbUser.role;
          token.memberStatus = dbUser.memberStatus;
        }
      }
      return token;
    },
  },
});
