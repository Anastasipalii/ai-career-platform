import type { Metadata } from "next";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import LinkedInClient from "@/app/components/linkedin-optimizer/LinkedInClient";

export const metadata: Metadata = {
  title: "AI LinkedIn Optimizer — CareerAI",
  description:
    "Rewrite your LinkedIn headline, summary, and experience with AI-generated copy. Increase recruiter visibility and profile views in minutes.",
};

interface PageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function LinkedInOptimizerPage({ searchParams }: PageProps) {
  const { id } = await searchParams;
  return (
    <>
      <Navbar />
      <main className="pt-16">
        <LinkedInClient initialProfileId={id} />
      </main>
      <Footer />
    </>
  );
}
