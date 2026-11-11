"use client";

import React from "react";
import { ConsoleProvider } from "@/store/consoleStore";
import { MaintenanceView } from "@/views/MaintenanceView";

export default function HealthPage() {
  return (
    <ConsoleProvider>
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <MaintenanceView />
      </div>
    </ConsoleProvider>
  );
}
