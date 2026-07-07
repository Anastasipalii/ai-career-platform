import type { Metadata } from "next";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import AIWorkflowClient from "@/app/components/ai-workflow/AIWorkflowClient";

export const metadata: Metadata = {
  title: "AI Workflow Studio — CareerAI",
  description:
    "Chain CareerAI's AI agents, n8n automations, and scheduled triggers into end-to-end workflows — from job description to a ready-to-send application kit.",
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
