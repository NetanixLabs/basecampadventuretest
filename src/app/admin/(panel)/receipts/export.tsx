"use client";

import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";

const lastMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

/** Monthly Excel file for the accountant: receipts, credit notes, bills, payments and VAT. */
export function AccountsExport() {
  const [month, setMonth] = useState(lastMonth);
  return (
    <form action="/api/accounts-export/" method="get" className="flex items-center gap-1 rounded-full border border-line bg-card py-1 pr-1 pl-3">
      <label htmlFor="acc-m" className="sr-only">Month</label>
      <input id="acc-m" name="month" type="month" required value={month} onChange={(e) => setMonth(e.target.value)} className="bg-transparent text-sm outline-none" />
      <button className="inline-flex items-center gap-1.5 rounded-full bg-pine/10 px-3 py-1.5 text-sm font-semibold text-pine hover:bg-pine/15" title="Excel file for your accountant: receipts, credit notes, bills, payments and VAT"><FileSpreadsheet className="size-4" aria-hidden />Accountant file</button>
    </form>
  );
}
