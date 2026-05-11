import type { Metadata } from "next";
import LoginForm from "@/app/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign In — CareerAI",
  description: "Sign in to your CareerAI account and continue building your career.",
};

export default function LoginPage() {
  return <LoginForm />;
}
