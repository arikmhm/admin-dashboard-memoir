"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Mail,
  Calendar,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Loader2,
  ReceiptText,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatRupiah, formatDate, formatDateTime } from "@/lib/format";
import { useOwnerDetail, useUpdateOwner } from "@/hooks/use-owners";
import { useTransactions } from "@/hooks/use-transactions";
import type { TxStatus, PaymentMethod } from "@/lib/types";

// ── Status / Payment helpers ─────────────────────────────────────────────────

const TX_STATUS_CONFIG: Record<
  TxStatus,
  { label: string; dotClass: string; textClass: string }
> = {
  PAID: {
    label: "Lunas",
    dotClass: "bg-emerald-500",
    textClass: "text-emerald-700",
  },
  PENDING: {
    label: "Pending",
    dotClass: "bg-amber-500",
    textClass: "text-amber-700",
  },
  FAILED: {
    label: "Gagal",
    dotClass: "bg-red-500",
    textClass: "text-red-700",
  },
  EXPIRED: {
    label: "Kedaluwarsa",
    dotClass: "bg-zinc-400",
    textClass: "text-zinc-500",
  },
};

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: "Tunai",
  PG: "Payment Gateway",
  STATIC_QRIS: "QRIS",
};

// ── Owner Detail Content ─────────────────────────────────────────────────────

function OwnerDetailContent({ id }: { id: string }) {
  const router = useRouter();
  const { owner, isLoading, error, refresh: refreshOwner } = useOwnerDetail(id);
  const updateOwner = useUpdateOwner();
  const [confirmDialog, setConfirmDialog] = useState<
    "deactivate" | "restore" | null
  >(null);

  const {
    transactions,
    isLoading: txLoading,
    refresh: refreshTx,
  } = useTransactions({ ownerId: id, limit: 10 });

  const handleToggleActive = async () => {
    if (!owner) return;
    const isDeactivating = !owner.deletedAt;

    try {
      await updateOwner.mutateAsync({
        id: owner.id,
        isActive: !isDeactivating,
      });
      refreshOwner();
      toast.success(
        isDeactivating ? "Owner dinonaktifkan" : "Owner diaktifkan kembali",
      );
      setConfirmDialog(null);
    } catch (err) {
      toast.error("Gagal mengubah status owner", {
        description: err instanceof Error ? err.message : "Coba lagi nanti",
      });
    }
  };

  const refresh = () => {
    refreshOwner();
    refreshTx();
  };

  // ── Loading state ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-sm border p-4 space-y-3">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-32" />
            </div>
          ))}
        </div>
        <div className="rounded-sm border border-zinc-200 overflow-hidden">
          <div className="px-4 py-3 border-b bg-zinc-50">
            <Skeleton className="h-4 w-32" />
          </div>
          <table className="w-full">
            <tbody className="divide-y divide-zinc-100">
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <Skeleton className="h-3 w-24" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-3 w-28" />
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <Skeleton className="h-3 w-16" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-3 w-20 ml-auto" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-3 w-16 ml-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────

  if (error || !owner) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/owners")}
          className="gap-1.5 text-zinc-500 hover:text-zinc-700"
        >
          <ArrowLeft className="size-3.5" />
          Kembali
        </Button>
        <div className="rounded-sm border border-red-200 bg-red-50 p-8 text-center">
          <AlertTriangle className="size-8 text-red-400 mx-auto mb-3" />
          <p className="font-medium text-red-700 text-sm">
            {error?.message ?? "Owner tidak ditemukan"}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            className="mt-3"
          >
            Coba lagi
          </Button>
        </div>
      </div>
    );
  }

  const isActive = !owner.deletedAt;

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-start justify-between gap-4 pb-5 border-b border-zinc-200">
        <div className="space-y-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/owners")}
            className="gap-1.5 text-zinc-500 hover:text-zinc-700 -ml-2"
          >
            <ArrowLeft className="size-3.5" />
            Kembali
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-zinc-950 tracking-tight">
              {owner.email}
            </h1>
            <div
              className={cn(
                "flex items-center gap-1.5 mt-1",
                isActive ? "text-emerald-700" : "text-zinc-500",
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full shrink-0",
                  isActive ? "bg-emerald-500" : "bg-zinc-400",
                )}
              />
              <span className="text-xs">
                {isActive ? "Aktif" : "Nonaktif"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw
              className={cn(
                "size-3",
                (isLoading || txLoading) && "animate-spin",
              )}
            />
          </Button>
          {isActive ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDialog("deactivate")}
              className="h-8 text-xs gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              <ShieldAlert className="size-3" />
              Nonaktifkan
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDialog("restore")}
              className="h-8 text-xs gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
            >
              <ShieldCheck className="size-3" />
              Aktifkan Kembali
            </Button>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InfoCard icon={Mail} label="Email" value={owner.email} />
        <InfoCard
          icon={Calendar}
          label="Tanggal Daftar"
          value={formatDate(owner.createdAt)}
        />
      </div>

      {/* Recent Transactions */}
      <div className="border border-zinc-200 rounded-sm overflow-hidden bg-white">
        <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50 flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-900 flex items-center gap-2">
            <ReceiptText className="size-3.5 text-zinc-400" />
            Transaksi Terakhir
          </h2>
          <span className="text-xs text-zinc-400">10 terbaru</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-400 uppercase tracking-wider hidden md:table-cell">
                  Tanggal
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-400 uppercase tracking-wider hidden sm:table-cell">
                  Metode
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Total
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {/* Loading skeleton */}
              {txLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2.5 hidden md:table-cell">
                      <Skeleton className="h-3 w-24" />
                    </td>
                    <td className="px-4 py-2.5">
                      <Skeleton className="h-3 w-28" />
                    </td>
                    <td className="px-4 py-2.5 hidden sm:table-cell">
                      <Skeleton className="h-3 w-16" />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Skeleton className="h-3 w-16 ml-auto" />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Skeleton className="h-3 w-14 ml-auto" />
                    </td>
                  </tr>
                ))}

              {/* Empty state */}
              {!txLoading && transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <ReceiptText className="size-6 text-zinc-300 mx-auto mb-2" />
                    <p className="text-sm text-zinc-400">Belum ada transaksi</p>
                  </td>
                </tr>
              )}

              {/* Data rows */}
              {!txLoading &&
                transactions.map((tx) => {
                  const sc = TX_STATUS_CONFIG[tx.status];
                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-zinc-50/50 transition-colors"
                    >
                      <td className="px-4 py-2.5 text-xs text-zinc-500 hidden md:table-cell align-top">
                        {formatDateTime(tx.createdAt)}
                      </td>
                      <td className="px-4 py-2.5 align-top">
                        <p className="text-xs font-mono text-zinc-600">
                          {tx.orderId}
                        </p>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-zinc-500 hidden sm:table-cell align-top">
                        {PAYMENT_METHOD_LABEL[tx.paymentMethod]}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs font-medium text-zinc-900 tabular-nums align-top">
                        {formatRupiah(tx.totalAmount)}
                      </td>
                      <td className="px-4 py-2.5 text-right align-top">
                        <div
                          className={cn(
                            "flex items-center justify-end gap-1.5",
                            sc.textClass,
                          )}
                        >
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full shrink-0",
                              sc.dotClass,
                            )}
                          />
                          <span className="text-xs">{sc.label}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deactivate / Restore Confirmation Dialog */}
      <Dialog
        open={confirmDialog !== null}
        onOpenChange={(v) => !v && setConfirmDialog(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirmDialog === "deactivate"
                ? "Nonaktifkan Owner?"
                : "Aktifkan Kembali Owner?"}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog === "deactivate"
                ? `Owner "${owner.email}" akan di-soft-delete. Semua kiosk miliknya tidak bisa digunakan lagi sampai diaktifkan kembali.`
                : `Owner "${owner.email}" akan diaktifkan kembali dan dapat menggunakan platform seperti semula.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog(null)}
              disabled={updateOwner.isPending}
            >
              Batal
            </Button>
            <Button
              variant={
                confirmDialog === "deactivate" ? "destructive" : "default"
              }
              onClick={handleToggleActive}
              disabled={updateOwner.isPending}
            >
              {updateOwner.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : confirmDialog === "deactivate" ? (
                "Nonaktifkan"
              ) : (
                "Aktifkan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Info Card ────────────────────────────────────────────────────────────────

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-sm border border-zinc-200 bg-white p-4 space-y-2">
      <div className="flex items-center gap-1.5">
        <Icon className="size-3 text-zinc-400" />
        <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
          {label}
        </p>
      </div>
      <p className="text-sm font-medium text-zinc-700 truncate">{value}</p>
    </div>
  );
}

// ── Page wrapper (unwrap async params) ───────────────────────────────────────

export default function OwnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <OwnerDetailContent id={id} />;
}
