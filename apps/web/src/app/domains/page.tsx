"use client";

import React from "react";
import { ConsoleProvider } from "@/store/consoleStore";
import { DomainsView } from "@/views/DomainsView";

export default function DomainsPage() {
  return (
    <ConsoleProvider>
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <DomainsView />
      </div>
    </ConsoleProvider>
  );
}
