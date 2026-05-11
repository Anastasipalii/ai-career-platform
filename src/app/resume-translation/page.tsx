import type { Metadata } from "next";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import ResumeTranslationClient from "@/app/components/resume-translation/ResumeTranslationClient";

export const metadata: Metadata = {
  title: "AI Resume Translation — CareerAI",
  description:
    "Translate your resume into 25+ languages while preserving professional formatting, ATS structure, and local job-market tone.",
};

export default function ResumeTranslationPage() {
  return (
    <>
      <Navbar />
      <main className="pt-16">
        <ResumeTranslationClient />
      </main>
      <Footer />
    </>
  );
}
