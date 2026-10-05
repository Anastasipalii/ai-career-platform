import type { Metadata } from "next";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import SimulationClient from "@/app/components/admin/SimulationClient";

export const metadata: Metadata = {
  title: "Load-Test Simulation — CareerAI Admin",
  description: "Admin-only controlled load-test simulation for the pipeline workflow.",
  robots: { index: false, follow: false },
};

export default function AdminSimulationPage() {
  return (
    <>
      <Navbar />
      <main className="pt-16">
        <SimulationClient />
      </main>
      <Footer />
    </>
  );
}
