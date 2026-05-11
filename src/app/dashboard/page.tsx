import type { Metadata } from "next";
import DashboardClient from "@/app/components/dashboard/DashboardClient";

export const metadata: Metadata = {
  title: "Dashboard — CareerAI",
  description: "Track your resumes, AI tools, and career progress in one place.",
};

export default function DashboardPage() {
  return <DashboardClient />;
}
