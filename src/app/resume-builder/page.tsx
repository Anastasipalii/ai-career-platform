import type { Metadata } from "next";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import ResumeBuilderClient from "@/app/components/resume-builder/ResumeBuilderClient";

export const metadata: Metadata = {
  title: "AI Resume Builder — CareerAI",
  description:
    "Build a professional, ATS-optimized resume in minutes. AI rewrites your content, translates to 30+ languages, and applies premium templates tailored to your target role.",
};

export default function ResumeBuilderPage() {
  return (
    <>
      <Navbar />
      <main className="pt-16">
        <ResumeBuilderClient />
      </main>
      <Footer />
    </>
  );
}
