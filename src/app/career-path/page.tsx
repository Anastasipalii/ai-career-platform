import type { Metadata } from "next";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import CareerPathClient from "@/app/components/career-path/CareerPathClient";

export const metadata: Metadata = {
  title: "AI Career Path Planner — CareerAI",
  description:
    "Build a personalised career roadmap based on your current skills, target role, and timeline. AI-powered milestones, skill gaps, and action plans.",
};

interface PageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function CareerPathPage({ searchParams }: PageProps) {
  const { id } = await searchParams;
  return (
    <>
      <Navbar />
      <main className="pt-16">
        <CareerPathClient initialPathId={id} />
      </main>
      <Footer />
    </>
  );
}
