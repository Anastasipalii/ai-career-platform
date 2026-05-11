import type { Metadata } from "next";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import JobMatchClient from "@/app/components/job-match/JobMatchClient";

export const metadata: Metadata = {
  title: "AI Job Match Engine — CareerAI",
  description:
    "Upload your resume and discover the roles, companies, and opportunities that best match your skills — powered by AI.",
};

export default function JobMatchPage() {
  return (
    <>
      <Navbar />
      <main className="pt-16">
        <JobMatchClient />
      </main>
      <Footer />
    </>
  );
}
