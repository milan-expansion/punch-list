"use client";

import { Download, Printer } from "lucide-react";

export default function PrintReportButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#238bac] px-5 font-bold text-white shadow-sm hover:bg-[#0086aa] print:hidden"
    >
      <Printer size={19} />
      Print / Save PDF
      <Download size={17} />
    </button>
  );
}