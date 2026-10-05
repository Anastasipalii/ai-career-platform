import type { Metadata } from "next";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import ResumeTranslationClient from "@/app/components/resume-translation/ResumeTranslationClient";

export const metadata: Metadata = {
  title: "AI Resume Translation — CareerAI",
  description:
    "Translate your resume text into 25+ languages faithfully — preserving your facts, numbers, dates, and section structure.",
};

interface PageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function ResumeTranslationPage({ searchParams }: PageProps) {
  const { id } = await searchParams;
  return (
    <>
      <Navbar />
      <main className="pt-16">
        <ResumeTranslationClient initialTranslationId={id} />
      </main>
      <Footer />
    </>
  );
}
