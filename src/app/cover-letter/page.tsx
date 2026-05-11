import type { Metadata } from "next";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import CoverLetterClient from "@/app/components/cover-letter/CoverLetterClient";

export const metadata: Metadata = {
  title: "AI Cover Letter Generator — CareerAI",
  description:
    "Create personalized, professional cover letters tailored to each job application in seconds. Supports 16+ languages and multiple tone styles.",
};

export default function CoverLetterPage() {
  return (
    <>
      <Navbar />
      <main className="pt-16">
        <CoverLetterClient />
      </main>
      <Footer />
    </>
  );
}
