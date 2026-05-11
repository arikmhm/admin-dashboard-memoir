"use client";

// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Transaction Monitoring Page (FEAT-SA-07)
// Read-only cross-owner transaction list with filters & pagination
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ReceiptText,
  AlertTriangle,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatRupiah, formatDateTime } from "@/lib/format";
import { useTransactions } from "@/hooks/use-transactions";
import type { TxStatus, PaymentMethod } from "@/lib/types";

// ── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const TX_STATUS_MAP: Record<TxStatus, { label: string; className: string }> = {
  PAID: {
    label: "Lunas",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  PENDING: {
    label: "Pending",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  FAILED: {
    label: "Gagal",
    className: "bg-red-50 text-red-700 border-red-200",
  },
  EXPIRED: {
    label: "Kedaluwarsa",
    className: "bg-zinc-100 text-zinc-500 border-zinc-200",
  },
};

const PAYMENT_METHOD_MAP: Record<PaymentMethod, string> = {
  CASH: "Cash",
  PG: "Payment Gateway",
  STATIC_QRIS: "QRIS",
};

type StatusFilter = TxStatus | undefined;
type MethodFilter = PaymentMethod | undefined;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: undefined, label: "Semua" },
  { value: "PAID", label: "Lunas" },
  { value: "PENDING", label: "Pending" },
  { value: "FAILED", label: "Gagal" },
  { value: "EXPIRED", label: "Kedaluwarsa" },
];

const METHOD_OPTIONS: { value: MethodFilter; label: string }[] = [
  { value: undefined, label: "Semua" },
  { value: "CASH", label: "Cash" },
  { value: "PG", label: "PG" },
  { value: "STATIC_QRIS", label: "QRIS" },
];

// ── Transactions Page ────────────────────────────────────────────────────────

export default function TransactionsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(undefined);
  const [methodFilter, setMethodFilter] = useState<MethodFilter>(undefined);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  const { transactions, meta, isLoading, error, refresh } = useTransactions({
    status: statusFilter,
    paymentMethod: methodFilter,
    startDate: startDate ? new Date(startDate).toISOString() : undefined,
    endDate: endDate
      ? new Date(endDate + "T23:59:59").toISOString()
      : undefined,
    search: search || undefined,
    page,
    limit: PAGE_SIZE,
  });

  const totalPages = Math.ceil(meta.total / PAGE_SIZE);

  const handleStatusChange = useCallback((value: StatusFilter) => {
    setStatusFilter(value);
    setPage(1);
  }, []);

  const handleMethodChange = useCallback((value: MethodFilter) => {
    setMethodFilter(value);
    setPage(1);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchInput("");
    setSearch("");
    setPage(1);
  }, []);

  const clearAllFilters = useCallback(() => {
    setStatusFilter(undefined);
    setMethodFilter(undefined);
    setStartDate("");
    setEndDate("");
    setSearchInput("");
    setSearch("");
    setPage(1);
  }, []);

  const hasActiveFilters =
    statusFilter !== undefined ||
    methodFilter !== undefined ||
    startDate !== "" ||
    endDate !== "" ||
    search !== "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-5 border-b border-zinc-100">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-zinc-950 tracking-tight">
            Transaksi
          </h1>
          <p className="text-sm text-zinc-500">
            Monitoring transaksi lintas semua owner.
            {!isLoading && (
              <span className="text-zinc-400 ml-1">{meta.total} transaksi</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn("h-8 text-xs gap-1.5", showFilters && "bg-zinc-100")}
          >
            <Filter className="size-3" />
            Filter
            {hasActiveFilters && (
              <span className="ml-0.5 h-4 min-w-4 rounded-full bg-zinc-900 text-white text-[10px] flex items-center justify-center px-1">
                !
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className={cn("size-3", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Search bar (always visible) */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
          <Input
            placeholder="Cari order ID atau email owner..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-8 pl-9 pr-8 text-xs"
          />
          {searchInput && (
            <button
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <X className="size-3" />
            </button>
          )}
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-8 text-xs text-zinc-400 hover:text-zinc-700"
          >
            Reset filter
          </Button>
        )}
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 space-y-4">
          {/* Status filter */}
          <div className="space-y-1.5">
            <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
              Status
            </p>
            <div className="flex items-center gap-1 flex-wrap">
              {STATUS_OPTIONS.map((opt) => (
                <Button
                  key={opt.label}
                  variant={statusFilter === opt.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleStatusChange(opt.value)}
                  className={cn(
                    "h-7 text-xs",
                    statusFilter === opt.value &&
                      "bg-zinc-950 text-white hover:bg-zinc-800",
                  )}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Payment method filter */}
          <div className="space-y-1.5">
            <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
              Metode Bayar
            </p>
            <div className="flex items-center gap-1 flex-wrap">
              {METHOD_OPTIONS.map((opt) => (
                <Button
                  key={opt.label}
                  variant={methodFilter === opt.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleMethodChange(opt.value)}
                  className={cn(
                    "h-7 text-xs",
                    methodFilter === opt.value &&
                      "bg-zinc-950 text-white hover:bg-zinc-800",
                  )}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Date range */}
          <div className="space-y-1.5">
            <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
              Rentang Tanggal
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="h-7 text-xs w-36"
              />
              <span className="text-xs text-zinc-400">s.d.</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="h-7 text-xs w-36"
              />
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="size-4 shrink-0" />
          <span className="font-medium">Gagal memuat data transaksi.</span>
          <button onClick={refresh} className="underline hover:text-red-900">
            Coba lagi
          </button>
        </div>
      )}

      {/* Table */}
      <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Tanggal
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider hidden md:table-cell">
                  Owner
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider hidden lg:table-cell">
                  Kiosk
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider hidden sm:table-cell">
                  Metode
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Total
                </th>
                <th className="text-center px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {/* Loading skeleton */}
              {isLoading &&
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3">
                      <Skeleton className="h-3 w-32" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-3 w-24" />
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Skeleton className="h-3 w-32" />
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <Skeleton className="h-3 w-20" />
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <Skeleton className="h-3 w-12" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Skeleton className="h-3 w-20 ml-auto" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Skeleton className="h-5 w-14 rounded-full mx-auto" />
                    </td>
                  </tr>
                ))}

              {/* Empty state */}
              {!isLoading && transactions.length === 0 && !error && (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center">
                        <ReceiptText className="size-4 text-zinc-400" />
                      </div>
                      <p className="text-sm font-medium text-zinc-500">
                        {hasActiveFilters
                          ? "Tidak ada transaksi yang cocok"
                          : "Belum ada transaksi"}
                      </p>
                      <p className="text-xs text-zinc-400 max-w-xs">
                        {hasActiveFilters
                          ? "Coba ubah filter atau kata kunci pencarian."
                          : "Transaksi akan muncul saat owner melakukan pembayaran."}
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {/* Data rows */}
              {!isLoading &&
                transactions.map((tx) => {
                  const statusInfo = TX_STATUS_MAP[tx.status];
                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-zinc-50/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="text-xs text-zinc-500">
                          {formatDateTime(tx.createdAt)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-mono text-zinc-700">
                          {tx.orderId}
                        </p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <p className="text-xs text-zinc-500 font-mono truncate max-w-[120px]" title={tx.ownerId}>
                          {tx.ownerId.slice(0, 8)}
                        </p>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <p className="text-xs text-zinc-500 font-mono truncate max-w-[120px]" title={tx.kioskId}>
                          {tx.kioskId.slice(0, 8)}
                        </p>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <p className="text-xs text-zinc-500">
                          {PAYMENT_METHOD_MAP[tx.paymentMethod]}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="text-xs font-medium text-zinc-900 tabular-nums">
                          {formatRupiah(tx.totalAmount)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          className={cn("text-[10px]", statusInfo.className)}
                        >
                          {statusInfo.label}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100 bg-zinc-50/50">
            <p className="text-xs text-zinc-400">
              Hal. {page} dari {totalPages}
              <span className="hidden sm:inline">
                {" "}
                · {meta.total} transaksi
              </span>
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              {(() => {
                const pages: number[] = [];
                let start = Math.max(1, page - 2);
                const end = Math.min(totalPages, start + 4);
                start = Math.max(1, end - 4);
                for (let i = start; i <= end; i++) pages.push(i);
                return pages.map((p) => (
                  <Button
                    key={p}
                    variant={p === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(p)}
                    className={cn(
                      "h-7 w-7 p-0 text-xs",
                      p === page && "bg-zinc-950 text-white hover:bg-zinc-800",
                    )}
                  >
                    {p}
                  </Button>
                ));
              })()}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
