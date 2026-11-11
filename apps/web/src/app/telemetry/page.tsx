"use client";

import React from "react";
import { ConsoleProvider } from "@/store/consoleStore";
import { UsageView } from "@/views/UsageView";

export default function TelemetryPage() {
  return (
    <ConsoleProvider>
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <UsageView />
      </div>
    </ConsoleProvider>
  );
}
