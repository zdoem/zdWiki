"use client";

import React from "react";
import { ConsoleProvider } from "@/store/consoleStore";
import { DiagnosticsView } from "@/views/DiagnosticsView";

export default function DiagnosticsPage() {
  return (
    <ConsoleProvider>
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <DiagnosticsView />
      </div>
    </ConsoleProvider>
  );
}
