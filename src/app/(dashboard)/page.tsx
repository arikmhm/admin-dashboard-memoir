"use client";

// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Admin Dashboard Home
// Platform-wide metrics summary: 3 stat cards
// Data: parallel fetch from /admin/owners, /admin/transactions
// ─────────────────────────────────────────────────────────────────────────────

import { useAdminDashboard } from "@/hooks/use-admin-dashboard";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  UserX,
  ReceiptText,
  RefreshCw,
  XCircle,
} from "lucide-react";

// ── Stat card component ──────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
}

function StatCard({ label, value, sub, icon: Icon }: StatCardProps) {
  return (
    <Card className="border-zinc-200 shadow-none transition-colors hover:border-zinc-300">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
            {label}
          </p>
          <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-zinc-50">
            <Icon className="h-4 w-4 text-zinc-400" />
          </div>
        </div>
        <p className="text-2xl font-semibold tracking-tight text-zinc-950">
          {value}
        </p>
        <p className="text-xs text-zinc-400">{sub}</p>
      </CardContent>
    </Card>
  );
}

// ── Stat card skeleton ───────────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <Card className="border-zinc-200 shadow-none">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-8 rounded-sm" />
        </div>
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-3 w-40" />
      </CardContent>
    </Card>
  );
}

// ── Main dashboard page ──────────────────────────────────────────────────────

export default function DashboardPage() {
  const { stats, isLoading, isRefetching, error, refresh } =
    useAdminDashboard();

  const currentDate = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const statCards: StatCardProps[] = stats
    ? [
        {
          label: "Studio Owner Aktif",
          value: String(stats.activeOwners),
          icon: Users,
          sub: "Owner dengan akun aktif",
        },
        {
          label: "Owner Nonaktif",
          value: String(stats.inactiveOwners),
          icon: UserX,
          sub: "Owner yang dinonaktifkan",
        },
        {
          label: "Transaksi Hari Ini",
          value: String(stats.todayTransactions),
          icon: ReceiptText,
          sub: currentDate,
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      {/* ── Heading ─────────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between border-b border-zinc-200 pb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
          Dashboard
        </h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={refresh}
          disabled={isRefetching}
          className="gap-1.5 text-zinc-400 hover:text-zinc-700"
          aria-label="Refresh data dashboard"
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", isRefetching && "animate-spin")}
          />
          <span className="hidden text-xs sm:inline">Refresh</span>
        </Button>
      </div>

      {/* ── Error state ─────────────────────────────────────────────────── */}
      {error && !isLoading && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-sm border border-red-200 bg-red-50 px-4 py-3"
        >
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-red-800">
              Gagal memuat data dashboard
            </p>
            <p className="mt-0.5 text-xs text-red-600">
              {error.message || "Terjadi kesalahan, coba lagi nanti."}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 border-red-300 text-red-700 hover:bg-red-100"
            onClick={refresh}
          >
            Coba Lagi
          </Button>
        </div>
      )}

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))
          : statCards.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </div>
    </div>
  );
}
