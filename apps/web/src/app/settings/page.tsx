"use client";

import React from "react";
import { ConsoleProvider } from "@/store/consoleStore";
import { SettingsView } from "@/views/SettingsView";

export default function SettingsPage() {
  return (
    <ConsoleProvider>
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <SettingsView />
      </div>
    </ConsoleProvider>
  );
}
