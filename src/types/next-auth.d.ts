import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "CLIENT" | "ADMIN";
      status: "PENDING" | "APPROVED" | "BLOCKED";
    } & DefaultSession["user"];
  }

  interface User {
    role: "CLIENT" | "ADMIN";
    status: "PENDING" | "APPROVED" | "BLOCKED";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "CLIENT" | "ADMIN";
    status: "PENDING" | "APPROVED" | "BLOCKED";
  }
}
