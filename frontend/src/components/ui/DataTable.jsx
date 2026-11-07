import { useState, useMemo } from "react";
import Skeleton from "./Skeleton";
import EmptyState from "./EmptyState";
import { IconChevronDown } from "./Icons";

export default function DataTable({
  columns = [], // [{ key, label, sortable, align, render }]
  data = [],
  loading = false,
  error = null,
  onRetry = null,
  emptyTitle = "No records found",
  emptyDescription = "There are no entries available to display at this time.",
  keyExtractor = (item, index) => item.id ?? index,
  className = "",
  style,
}) {
  const [sortKey, setSortKey] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc"); // 'asc' | 'desc'

  const handleSort = (key) => {
    if (sortKey === key) {
      if (sortOrder === "asc") setSortOrder("desc");
      else {
        setSortKey(null);
        setSortOrder("asc");
      }
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === "number" && typeof valB === "number") {
        return sortOrder === "asc" ? valA - valB : valB - valA;
      }
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortOrder === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [data, sortKey, sortOrder]);

  return (
    <div className={`tb-table-container ${className}`.trim()} style={style}>
      <table className="tb-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  textAlign: col.align || "left",
                  cursor: col.sortable ? "pointer" : "default",
                  userSelect: col.sortable ? "none" : "auto",
                }}
                onClick={() => col.sortable && handleSort(col.key)}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    justifyContent: col.align === "right" ? "flex-end" : "flex-start",
                    width: "100%",
                  }}
                >
                  <span>{col.label}</span>
                  {col.sortable && (
                    <span
                      style={{
                        display: "inline-flex",
                        transform:
                          sortKey === col.key && sortOrder === "desc"
                            ? "rotate(180deg)"
                            : "none",
                        transition: "transform 150ms ease",
                        opacity: sortKey === col.key ? 1 : 0.35,
                      }}
                    >
                      <IconChevronDown size={14} />
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 4 }).map((_, rIdx) => (
              <tr key={`loading-row-${rIdx}`}>
                {columns.map((col, cIdx) => (
                  <td key={`loading-col-${cIdx}`}>
                    <Skeleton height="18px" width={cIdx === 0 ? "80%" : "50%"} />
                  </td>
                ))}
              </tr>
            ))
          ) : error ? (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: "center", padding: "var(--space-8)" }}>
                <p style={{ color: "var(--color-danger)", marginBottom: "var(--space-2)" }}>
                  {error}
                </p>
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    style={{
                      padding: "4px 12px",
                      background: "var(--surface-sunken)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "var(--font-size-xs)",
                      cursor: "pointer",
                    }}
                  >
                    Retry Loading
                  </button>
                )}
              </td>
            </tr>
          ) : sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ padding: "0" }}>
                <EmptyState title={emptyTitle} description={emptyDescription} />
              </td>
            </tr>
          ) : (
            sortedData.map((row, idx) => (
              <tr key={keyExtractor(row, idx)}>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={col.numeric ? "num-col" : ""}
                    style={{ textAlign: col.align || (col.numeric ? "right" : "left") }}
                  >
                    {col.render ? col.render(row[col.key], row, idx) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

