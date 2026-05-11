import type { Metadata } from "next";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import CareerPathClient from "@/app/components/career-path/CareerPathClient";

export const metadata: Metadata = {
  title: "AI Career Path Planner — CareerAI",
  description:
    "Build a personalised career roadmap based on your current skills, target role, and timeline. AI-powered milestones, skill gaps, and action plans.",
};

export default function CareerPathPage() {
  return (
    <>
      <Navbar />
      <main className="pt-16">
        <CareerPathClient />
      </main>
      <Footer />
    </>
  );
}
