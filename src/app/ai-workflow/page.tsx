import type { Metadata } from "next";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import AIWorkflowClient from "@/app/components/ai-workflow/AIWorkflowClient";

export const metadata: Metadata = {
  title: "AI Workflow Studio — CareerAI",
  description:
    "Run CareerAI's AI agents as one end-to-end pass — from your résumé and a target role to ranked real jobs, a grounded cover letter, interview prep, and a non-submitting application dry run.",
};

export default function AIWorkflowPage() {
  return (
    <>
      <Navbar />
      <main className="pt-16">
        <AIWorkflowClient />
      </main>
      <Footer />
    </>
  );
}
