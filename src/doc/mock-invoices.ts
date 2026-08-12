import type { InvoiceDoc } from "@/types";
export * from "../services/invoices";

export function subscribeToInvoices(_p: string, cb: (i: InvoiceDoc[]) => void) {
  cb([]);
  return () => undefined;
}
