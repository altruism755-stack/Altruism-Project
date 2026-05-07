import { useState } from "react";

const GREEN = "#16A34A";

export const PAGE_SIZE = 20;

export function usePagination<T>(items: T[], pageSize = PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  function reset() { setPage(1); }

  return { page: safePage, setPage, totalPages, pageItems, reset };
}

interface PaginationProps {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
  totalItems?: number;
  pageSize?: number;
}

export function Pagination({ page, totalPages, onPage, totalItems, pageSize = PAGE_SIZE }: PaginationProps) {
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems ?? page * pageSize);

  const pages: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("…");
    pages.push(totalPages);
  }

  const btnBase: React.CSSProperties = {
    height: 32, minWidth: 32, padding: "0 8px", border: "1px solid #E2E8F0",
    borderRadius: 6, fontSize: 13, cursor: "pointer", display: "inline-flex",
    alignItems: "center", justifyContent: "center", backgroundColor: "#fff", color: "#475569",
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, flexWrap: "wrap", gap: 8 }}>
      {totalItems !== undefined ? (
        <span style={{ fontSize: 13, color: "#94A3B8" }}>
          {start}–{end} of {totalItems}
        </span>
      ) : <span />}
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          style={{ ...btnBase, opacity: page === 1 ? 0.4 : 1, cursor: page === 1 ? "default" : "pointer" }}
        >
          ‹
        </button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} style={{ fontSize: 13, color: "#94A3B8", padding: "0 4px" }}>…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p as number)}
              style={{
                ...btnBase,
                backgroundColor: p === page ? GREEN : "#fff",
                color: p === page ? "#fff" : "#475569",
                borderColor: p === page ? GREEN : "#E2E8F0",
                fontWeight: p === page ? 600 : 400,
              }}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages}
          style={{ ...btnBase, opacity: page === totalPages ? 0.4 : 1, cursor: page === totalPages ? "default" : "pointer" }}
        >
          ›
        </button>
      </div>
    </div>
  );
}
