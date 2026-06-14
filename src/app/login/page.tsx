import type { Metadata } from "next";
import LoginForm from "./login-form";

export const metadata: Metadata = {
  title: "Sign In - MobileX Admin Portal",
  description: "Log in to the MobileX back-office management console.",
};

export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-slate-950 px-4 py-12 sm:px-6 lg:px-8">
      <LoginForm />
    </div>
  );
}
