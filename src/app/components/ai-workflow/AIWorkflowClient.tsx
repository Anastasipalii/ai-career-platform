"use client";

import AIWorkflowHero from "./AIWorkflowHero";
import WorkflowCanvas from "./WorkflowCanvas";
import WorkflowJourney from "./WorkflowJourney";
import AutomationAgentLayer from "./AutomationAgentLayer";
import WorkflowCTA from "./WorkflowCTA";

export default function AIWorkflowClient() {
  return (
    <>
      <AIWorkflowHero />
      <div className="section-divider" />
      <WorkflowCanvas />
      <div className="section-divider" />
      <WorkflowJourney />
      <div className="section-divider" />
      <AutomationAgentLayer />
      <div className="section-divider" />
      <WorkflowCTA />
    </>
  );
}
