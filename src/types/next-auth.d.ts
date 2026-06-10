import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      organizationId?: string | null;
      role?: string;
      memberStatus?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    organizationId?: string | null;
    role?: string;
    memberStatus?: string;
  }
}
