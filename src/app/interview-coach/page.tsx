import type { Metadata } from "next";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import InterviewClient from "@/app/components/interview-coach/InterviewClient";

export const metadata: Metadata = {
  title: "AI Interview Coach — CareerAI",
  description:
    "Practice job interviews with AI-powered questions, structured feedback, and role-specific preparation. Available in 10 languages.",
};

export default function InterviewCoachPage() {
  return (
    <>
      <Navbar />
      <main className="pt-16">
        <InterviewClient />
      </main>
      <Footer />
    </>
  );
}
