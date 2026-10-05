import type { Metadata } from "next";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import CoverLetterClient from "@/app/components/cover-letter/CoverLetterClient";

export const metadata: Metadata = {
  title: "AI Cover Letter Generator — CareerAI",
  description:
    "Create personalized, professional cover letters tailored to each job application in seconds. Supports 16+ languages and multiple tone styles.",
};

interface PageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function CoverLetterPage({ searchParams }: PageProps) {
  const { id } = await searchParams;
  return (
    <>
      <Navbar />
      <main className="pt-16">
        <CoverLetterClient initialLetterId={id} />
      </main>
      <Footer />
    </>
  );
}
