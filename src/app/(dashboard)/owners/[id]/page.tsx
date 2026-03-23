"use client";

// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Owner Detail Page (FEAT-SA-03)
// Owner info, recent transactions, deactivate/restore action
// ─────────────────────────────────────────────────────────────────────────────

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Mail,
  Calendar,
  Wallet,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Loader2,
  ReceiptText,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { api } from "@/lib/api";
import type { ApiPaginatedResponse } from "@/lib/api";
import type { Transaction, TxStatus, PaymentMethod } from "@/lib/types";

// ── Status / Payment helpers ─────────────────────────────────────────────────

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

// ── Owner Detail Content ─────────────────────────────────────────────────────

function OwnerDetailContent({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { owner, isLoading, error } = useOwnerDetail(id);
  const updateOwner = useUpdateOwner();
  const [confirmDialog, setConfirmDialog] = useState<
    "deactivate" | "restore" | null
  >(null);

  // Fetch recent transactions for this owner
  const txQuery = useQuery({
    queryKey: ["/admin/transactions", { ownerId: id }],
    queryFn: () =>
      api.get<ApiPaginatedResponse<Transaction>>(
        `/admin/transactions?ownerId=${id}&limit=10`,
      ),
    enabled: !!id,
    staleTime: 30_000,
  });

  const transactions = txQuery.data?.data ?? [];

  const handleToggleActive = async () => {
    if (!owner) return;
    const isDeactivating = !owner.deletedAt;

    try {
      await updateOwner.mutateAsync({
        id: owner.id,
        isActive: !isDeactivating,
      });
      queryClient.invalidateQueries({ queryKey: ["/admin/owners", id] });
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
    queryClient.invalidateQueries({ queryKey: ["/admin/owners", id] });
    queryClient.invalidateQueries({
      queryKey: ["/admin/transactions", { ownerId: id }],
    });
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-4 space-y-3">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-32" />
            </div>
          ))}
        </div>
        <div className="rounded-lg border">
          <div className="p-4 border-b">
            <Skeleton className="h-4 w-32" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-4 border-b last:border-0"
            >
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-20 ml-auto" />
            </div>
          ))}
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
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
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
      <div className="flex items-start justify-between gap-4">
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
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-zinc-950 tracking-tight flex items-center gap-2">
                {owner.email}
                <Badge
                  className={cn(
                    "text-[10px]",
                    isActive
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-zinc-100 text-zinc-500 border-zinc-200",
                  )}
                >
                  {isActive ? "Aktif" : "Nonaktif"}
                </Badge>
              </h1>
              <p className="text-sm text-zinc-500 mt-0.5">{owner.email}</p>
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
                (isLoading || txQuery.isLoading) && "animate-spin",
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <InfoCard icon={Mail} label="Email" value={owner.email} />
        <InfoCard
          icon={Calendar}
          label="Tanggal Daftar"
          value={formatDate(owner.createdAt)}
        />
        <InfoCard
          icon={Wallet}
          label="Saldo Wallet"
          value={formatRupiah(owner.walletBalance)}
          highlight
        />
      </div>

      {/* Recent Transactions */}
      <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
        <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50 flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-900 flex items-center gap-2">
            <ReceiptText className="size-3.5 text-zinc-400" />
            Transaksi Terakhir
          </h2>
          <span className="text-xs text-zinc-400">Menampilkan 10 terbaru</span>
        </div>

        {txQuery.isLoading && (
          <div className="divide-y divide-zinc-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-3 w-20 ml-auto" />
              </div>
            ))}
          </div>
        )}

        {!txQuery.isLoading && transactions.length === 0 && (
          <div className="px-4 py-12 text-center">
            <ReceiptText className="size-6 text-zinc-300 mx-auto mb-2" />
            <p className="text-sm text-zinc-400">Belum ada transaksi</p>
          </div>
        )}

        {!txQuery.isLoading && transactions.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-400 uppercase tracking-wider hidden sm:table-cell">
                    Metode
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Jumlah
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-zinc-400 uppercase tracking-wider hidden md:table-cell">
                    Tanggal
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {transactions.map((tx) => {
                  const statusInfo = TX_STATUS_MAP[tx.status];
                  return (
                    <tr key={tx.id} className="hover:bg-zinc-50/50">
                      <td className="px-4 py-2.5">
                        <p className="text-xs font-mono text-zinc-600">
                          {tx.orderId}
                        </p>
                      </td>
                      <td className="px-4 py-2.5 hidden sm:table-cell">
                        <p className="text-xs text-zinc-500">
                          {PAYMENT_METHOD_MAP[tx.paymentMethod]}
                        </p>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge
                          className={cn("text-[10px]", statusInfo.className)}
                        >
                          {statusInfo.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <p className="text-xs font-medium text-zinc-900 tabular-nums">
                          {formatRupiah(tx.totalAmount)}
                        </p>
                      </td>
                      <td className="px-4 py-2.5 text-right hidden md:table-cell">
                        <p className="text-xs text-zinc-500">
                          {formatDateTime(tx.createdAt)}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 space-y-2">
      <div className="flex items-center gap-1.5">
        <Icon className="size-3 text-zinc-400" />
        <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
          {label}
        </p>
      </div>
      <p
        className={cn(
          "text-sm font-medium truncate",
          highlight ? "text-zinc-950" : "text-zinc-700",
        )}
      >
        {value}
      </p>
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
