"use client";

// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Withdrawal Processing Page (FEAT-SA-06)
// Withdrawal list with status filter, pagination, approve/reject actions
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Loader2,
  Banknote,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatRupiah, formatDateTime } from "@/lib/format";
import {
  useWithdrawals,
  useApproveWithdrawal,
  useRejectWithdrawal,
} from "@/hooks/use-withdrawals";
import { ApiError } from "@/lib/api";
import type { Withdrawal, WithdrawalStatus } from "@/lib/types";

// ── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

type StatusFilter = "PENDING" | "PROCESSED" | "REJECTED" | undefined;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "PENDING", label: "Menunggu" },
  { value: undefined, label: "Semua" },
  { value: "PROCESSED", label: "Diproses" },
  { value: "REJECTED", label: "Ditolak" },
];

const STATUS_BADGE: Record<
  WithdrawalStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Menunggu",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  PROCESSED: {
    label: "Diproses",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  REJECTED: {
    label: "Ditolak",
    className: "bg-red-50 text-red-700 border-red-200",
  },
};

// ── Approve Dialog ───────────────────────────────────────────────────────────

function ApproveDialog({
  open,
  onOpenChange,
  withdrawal,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  withdrawal: Withdrawal | null;
}) {
  const approve = useApproveWithdrawal();

  const handleApprove = async () => {
    if (!withdrawal) return;
    try {
      await approve.mutateAsync(withdrawal.id);
      toast.success("Withdrawal berhasil di-approve", {
        description: `${formatRupiah(withdrawal.amount)} untuk ${withdrawal.bankAccountName}`,
      });
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        toast.error("Saldo owner tidak mencukupi", {
          description: "Saldo owner tidak mencukupi untuk withdrawal ini.",
        });
      } else {
        toast.error("Gagal approve withdrawal", {
          description: err instanceof Error ? err.message : "Coba lagi nanti",
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Approve Withdrawal?</DialogTitle>
          <DialogDescription>
            {withdrawal && (
              <>
                Approve withdrawal{" "}
                <span className="font-semibold text-zinc-700">
                  {formatRupiah(withdrawal.amount)}
                </span>{" "}
                untuk{" "}
                <span className="font-semibold text-zinc-700">
                  {withdrawal.bankAccountName}
                </span>
                ?
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {withdrawal && (
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-500">Bank</span>
              <span className="text-zinc-700 font-medium">
                {withdrawal.bankName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">No. Rekening</span>
              <span className="text-zinc-700 font-mono">
                {withdrawal.bankAccountNumber}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Atas Nama</span>
              <span className="text-zinc-700">
                {withdrawal.bankAccountName}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          <Info className="size-3.5 mt-0.5 shrink-0" />
          <span>
            Transfer dana ke rekening dilakukan secara manual di luar sistem.
            Approval hanya mencatat status.
          </span>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={approve.isPending}
          >
            Batal
          </Button>
          <Button
            onClick={handleApprove}
            disabled={approve.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {approve.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                Approve
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Reject Dialog ────────────────────────────────────────────────────────────

function RejectDialog({
  open,
  onOpenChange,
  withdrawal,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  withdrawal: Withdrawal | null;
}) {
  const reject = useRejectWithdrawal();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<{ rejectionNote: string }>({
    defaultValues: { rejectionNote: "" },
  });

  const onSubmit = async (data: { rejectionNote: string }) => {
    if (!withdrawal) return;
    try {
      await reject.mutateAsync({
        id: withdrawal.id,
        rejectionNote: data.rejectionNote.trim(),
      });
      toast.success("Withdrawal ditolak");
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error("Gagal menolak withdrawal", {
        description: err instanceof Error ? err.message : "Coba lagi nanti",
      });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tolak Withdrawal?</DialogTitle>
          <DialogDescription>
            {withdrawal && (
              <>
                Tolak withdrawal{" "}
                <span className="font-semibold text-zinc-700">
                  {formatRupiah(withdrawal.amount)}
                </span>{" "}
                dari{" "}
                <span className="font-semibold text-zinc-700">
                  {withdrawal.bankAccountName}
                </span>
                . Saldo owner tidak akan berubah.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rejection-note">Alasan Penolakan *</Label>
            <Textarea
              id="rejection-note"
              placeholder="Contoh: Nomor rekening tidak valid"
              className="resize-none h-20"
              {...register("rejectionNote", {
                required: "Alasan penolakan wajib diisi",
                minLength: {
                  value: 1,
                  message: "Alasan penolakan wajib diisi",
                },
              })}
            />
            {errors.rejectionNote && (
              <p className="text-xs text-destructive">
                {errors.rejectionNote.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={reject.isPending}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={reject.isPending}
            >
              {reject.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menolak...
                </>
              ) : (
                <>
                  <XCircle className="mr-1.5 h-3.5 w-3.5" />
                  Tolak
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Detail Dialog ────────────────────────────────────────────────────────────

function DetailDialog({
  open,
  onOpenChange,
  withdrawal,
  onApprove,
  onReject,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  withdrawal: Withdrawal | null;
  onApprove: () => void;
  onReject: () => void;
}) {
  if (!withdrawal) return null;

  const badge = STATUS_BADGE[withdrawal.status];
  const isPending = withdrawal.status === "PENDING";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Detail Withdrawal
            <Badge className={cn("text-[10px]", badge.className)}>
              {badge.label}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Request info */}
          <div className="space-y-1.5">
            <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
              Info Request
            </p>
            <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Jumlah</span>
                <span className="text-zinc-900 font-semibold tabular-nums">
                  {formatRupiah(withdrawal.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Bank</span>
                <span className="text-zinc-700">{withdrawal.bankName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">No. Rekening</span>
                <span className="text-zinc-700 font-mono">
                  {withdrawal.bankAccountNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Atas Nama</span>
                <span className="text-zinc-700">
                  {withdrawal.bankAccountName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Tanggal Request</span>
                <span className="text-zinc-700">
                  {formatDateTime(withdrawal.createdAt)}
                </span>
              </div>
              {withdrawal.processedAt && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Tanggal Proses</span>
                  <span className="text-zinc-700">
                    {formatDateTime(withdrawal.processedAt)}
                  </span>
                </div>
              )}
              {withdrawal.rejectionNote && (
                <div className="pt-1.5 border-t border-zinc-200">
                  <span className="text-zinc-500 block mb-0.5">
                    Alasan Penolakan
                  </span>
                  <span className="text-red-600">
                    {withdrawal.rejectionNote}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          {isPending ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  onReject();
                }}
                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              >
                <XCircle className="mr-1.5 h-3.5 w-3.5" />
                Tolak
              </Button>
              <Button
                onClick={() => {
                  onOpenChange(false);
                  onApprove();
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                Approve
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Tutup
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Withdrawals Page ─────────────────────────────────────────────────────────

export default function WithdrawalsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("PENDING");
  const [page, setPage] = useState(1);
  const { withdrawals, meta, isLoading, error, refresh } = useWithdrawals({
    status: statusFilter,
    page,
    limit: PAGE_SIZE,
  });

  // Dialogs
  const [detailW, setDetailW] = useState<Withdrawal | null>(null);
  const [approveW, setApproveW] = useState<Withdrawal | null>(null);
  const [rejectW, setRejectW] = useState<Withdrawal | null>(null);

  const totalPages = Math.ceil(meta.total / PAGE_SIZE);

  const handleStatusChange = useCallback((value: StatusFilter) => {
    setStatusFilter(value);
    setPage(1);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-5 border-b border-zinc-100">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-zinc-950 tracking-tight">
            Penarikan
          </h1>
          <p className="text-sm text-zinc-500">
            Proses approve / reject withdrawal request.
            {!isLoading && (
              <span className="text-zinc-400 ml-1">
                {meta.total} withdrawal
              </span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          className="h-8 text-xs gap-1.5 shrink-0"
        >
          <RefreshCw className={cn("size-3", isLoading && "animate-spin")} />
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-1 flex-wrap">
        {STATUS_OPTIONS.map((opt) => (
          <Button
            key={opt.label}
            variant={statusFilter === opt.value ? "default" : "outline"}
            size="sm"
            onClick={() => handleStatusChange(opt.value)}
            className={cn(
              "h-8 text-xs",
              statusFilter === opt.value &&
                "bg-zinc-950 text-white hover:bg-zinc-800",
            )}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* Error state */}
      {error && !isLoading && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="size-4 shrink-0" />
          <span className="font-medium">Gagal memuat data withdrawal.</span>
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
                  Tanggal Request
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Atas Nama
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Jumlah
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider hidden md:table-cell">
                  Bank Tujuan
                </th>
                <th className="text-center px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {/* Loading skeleton */}
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3">
                      <Skeleton className="h-3 w-32" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-3 w-36" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Skeleton className="h-3 w-20 ml-auto" />
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Skeleton className="h-3 w-24" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Skeleton className="h-5 w-16 rounded-full mx-auto" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Skeleton className="h-7 w-20 ml-auto" />
                    </td>
                  </tr>
                ))}

              {/* Empty state */}
              {!isLoading && withdrawals.length === 0 && !error && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center">
                        <Banknote className="size-4 text-zinc-400" />
                      </div>
                      <p className="text-sm font-medium text-zinc-500">
                        {statusFilter === "PENDING"
                          ? "Tidak ada withdrawal yang menunggu"
                          : "Tidak ada withdrawal ditemukan"}
                      </p>
                      <p className="text-xs text-zinc-400 max-w-xs">
                        {statusFilter === "PENDING"
                          ? "Semua withdrawal sudah diproses."
                          : "Coba ubah filter status."}
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {/* Data rows */}
              {!isLoading &&
                withdrawals.map((w) => {
                  const badge = STATUS_BADGE[w.status];
                  const isPending = w.status === "PENDING";
                  return (
                    <tr
                      key={w.id}
                      className="hover:bg-zinc-50/50 transition-colors cursor-pointer"
                      onClick={() => setDetailW(w)}
                    >
                      <td className="px-4 py-3">
                        <p className="text-xs text-zinc-500">
                          {formatDateTime(w.createdAt)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-zinc-700">
                          {w.bankAccountName}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="text-sm font-medium text-zinc-900 tabular-nums">
                          {formatRupiah(w.amount)}
                        </p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <p className="text-xs text-zinc-700">
                          {w.bankName} · {w.bankAccountNumber}
                        </p>
                        <p className="text-xs text-zinc-400">
                          {w.bankAccountName}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={cn("text-[10px]", badge.className)}>
                          {badge.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isPending ? (
                          <div
                            className="flex items-center justify-end gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setRejectW(w)}
                            >
                              <XCircle className="size-3 mr-1" />
                              Tolak
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => setApproveW(w)}
                            >
                              <CheckCircle2 className="size-3 mr-1" />
                              Approve
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-zinc-400"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailW(w);
                            }}
                          >
                            Detail
                          </Button>
                        )}
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
                · {meta.total} withdrawal
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

      {/* Dialogs */}
      <DetailDialog
        open={detailW !== null}
        onOpenChange={(v) => !v && setDetailW(null)}
        withdrawal={detailW}
        onApprove={() => {
          setDetailW(null);
          if (detailW) setApproveW(detailW);
        }}
        onReject={() => {
          setDetailW(null);
          if (detailW) setRejectW(detailW);
        }}
      />
      <ApproveDialog
        open={approveW !== null}
        onOpenChange={(v) => !v && setApproveW(null)}
        withdrawal={approveW}
      />
      <RejectDialog
        open={rejectW !== null}
        onOpenChange={(v) => !v && setRejectW(null)}
        withdrawal={rejectW}
      />
    </div>
  );
}
