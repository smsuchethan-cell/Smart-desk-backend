import React from "react";
import { useMode } from "../context/ModeContext";
import EventDashboard from "./EventDashboard";
import SchoolDashboard from "./SchoolDashboard";
import RetailDashboard from "./RetailDashboard";
import CorporateDashboard from "./CorporateDashboard";

export default function Dashboard() {
  const { mode } = useMode();

  switch (mode) {
    case "School":
      return <SchoolDashboard />;
    case "Retail":
      return <RetailDashboard />;
    case "Corporate":
      return <CorporateDashboard />;
    case "Event":
    default:
      return <EventDashboard />;
  }
}
