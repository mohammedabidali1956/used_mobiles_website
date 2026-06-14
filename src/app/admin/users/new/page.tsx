import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import CreateUserForm from "./create-user-form";

export const metadata: Metadata = {
  title: "Create User - MobileX Admin",
};

export default async function CreateUserPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // Only SUPER_ADMIN can create users
  if (session.role !== "SUPER_ADMIN") redirect("/admin/users");

  return <CreateUserForm />;
}
