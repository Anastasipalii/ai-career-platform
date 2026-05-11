import type { Metadata } from "next";
import SignupForm from "@/app/components/auth/SignupForm";

export const metadata: Metadata = {
  title: "Create Account — CareerAI",
  description: "Create your free CareerAI account and start building better resumes and career plans with AI.",
};

export default function SignupPage() {
  return <SignupForm />;
}
