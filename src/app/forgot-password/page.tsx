import type { Metadata } from "next";
import ForgotPasswordForm from "@/app/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Reset Password — CareerAI",
  description: "Reset your CareerAI account password.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
