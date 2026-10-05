import type { Metadata } from "next";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import MonitoringClient from "@/app/components/admin/MonitoringClient";

export const metadata: Metadata = {
  title: "Pipeline Monitoring — CareerAI Admin",
  description: "Admin-only monitoring dashboard for workflow runs and their event timelines.",
  robots: { index: false, follow: false },
};

export default function AdminMonitoringPage() {
  return (
    <>
      <Navbar />
      <main className="pt-16">
        <MonitoringClient />
      </main>
      <Footer />
    </>
  );
}
