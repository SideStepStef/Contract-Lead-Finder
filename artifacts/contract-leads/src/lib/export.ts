import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

type Lead = {
  id: number;
  title: string;
  issuer?: string | null;
  category: string;
  status: string;
  contractValue?: number | null;
  deadline?: string | null;
  sourceUrl?: string | null;
  createdAt: string;
};

const formatCurrency = (value: number | null | undefined) => {
  if (value == null) return "";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return "";
  try { return format(new Date(value), "MMM dd, yyyy"); } catch { return value; }
};

export function exportCSV(leads: Lead[], filename = "contract-leads.csv") {
  const headers = ["ID", "Title", "Issuer", "Category", "Status", "Contract Value", "Deadline", "Source URL", "Created"];
  const rows = leads.map((l) => [
    l.id.toString().padStart(4, "0"),
    l.title,
    l.issuer ?? "",
    l.category,
    l.status,
    l.contractValue != null ? l.contractValue.toString() : "",
    formatDate(l.deadline),
    l.sourceUrl ?? "",
    formatDate(l.createdAt),
  ]);

  const escape = (cell: string) => `"${cell.replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map((row) => row.map(escape).join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportPDF(leads: Lead[], title = "Contract Lead Pipeline") {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const now = format(new Date(), "MMM dd, yyyy");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`Exported ${now}  ·  ${leads.length} lead${leads.length !== 1 ? "s" : ""}`, 14, 25);

  const totalValue = leads.reduce((sum, l) => sum + (l.contractValue ?? 0), 0);
  if (totalValue > 0) {
    doc.text(`Total pipeline value: ${formatCurrency(totalValue)}`, 14, 30);
  }

  doc.setTextColor(0, 0, 0);

  const statusColors: Record<string, [number, number, number]> = {
    new:         [100, 116, 139],
    researching: [59,  130, 246],
    bidding:     [168, 85,  247],
    won:         [34,  197, 94],
    lost:        [239, 68,  68],
    archived:    [107, 114, 128],
  };

  autoTable(doc, {
    startY: 36,
    head: [["ID", "Title", "Issuer", "Category", "Status", "Value", "Deadline", "Created"]],
    body: leads.map((l) => [
      l.id.toString().padStart(4, "0"),
      l.title,
      l.issuer ?? "—",
      l.category.toUpperCase(),
      l.status.toUpperCase(),
      l.contractValue != null ? formatCurrency(l.contractValue) : "—",
      formatDate(l.deadline) || "—",
      formatDate(l.createdAt),
    ]),
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [248, 250, 252],
      fontStyle: "bold",
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 14 },
      3: { cellWidth: 24 },
      4: { cellWidth: 24 },
      5: { cellWidth: 28, halign: "right" },
      6: { cellWidth: 24 },
      7: { cellWidth: 24 },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didDrawCell: (data) => {
      if (data.section === "body" && data.column.index === 4) {
        const status = leads[data.row.index]?.status;
        const color = statusColors[status] ?? [100, 116, 139];
        doc.setTextColor(...color);
        doc.setFont("helvetica", "bold");
        if (data.cell.text[0]) {
          doc.text(data.cell.text[0], data.cell.x + 2, data.cell.y + data.cell.height / 2 + 1);
        }
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
      }
    },
  });

  const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text(`Page ${i} of ${pageCount}  ·  Contract Lead Finder`, 14, doc.internal.pageSize.height - 6);
  }

  doc.save(`contract-leads-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}
