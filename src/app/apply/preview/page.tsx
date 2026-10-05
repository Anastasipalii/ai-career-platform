import type { Metadata } from "next";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import ApplyPreviewClient from "@/app/components/apply/ApplyPreviewClient";

export const metadata: Metadata = {
  title: "Application Preview (Dry Run) — CareerAI",
  description: "Prepare and validate an application package. Test mode — no real application is ever sent.",
  robots: { index: false, follow: false },
};

export default function ApplyPreviewPage() {
  return (
    <>
      <Navbar />
      <main className="pt-16">
        <ApplyPreviewClient />
      </main>
      <Footer />
    </>
  );
}
