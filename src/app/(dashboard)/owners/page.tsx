"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  Search,
  Plus,
  X,
  Users,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { formatDate } from "@/lib/format";
import { useOwners, useCreateOwner } from "@/hooks/use-owners";
import { ApiError } from "@/lib/api";
import type { Owner, CreateOwnerRequest } from "@/lib/types";

// ── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

type StatusFilter = "all" | "active" | "inactive";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Semua Status" },
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Nonaktif" },
];

// ── Create Owner Modal ───────────────────────────────────────────────────────

function CreateOwnerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createOwner = useCreateOwner();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setError,
  } = useForm<CreateOwnerRequest>({
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: CreateOwnerRequest) => {
    try {
      await createOwner.mutateAsync({
        email: data.email.trim().toLowerCase(),
        password: data.password,
      });
      toast.success("Owner berhasil dibuat", {
        description: "Kirimkan password sementara ke owner via WhatsApp/email.",
      });
      reset();
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("email", { message: "Email sudah terdaftar" });
      } else {
        toast.error("Gagal membuat owner", {
          description: err instanceof Error ? err.message : "Coba lagi nanti",
        });
      }
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
          <DialogTitle>Buat Owner Baru</DialogTitle>
          <DialogDescription>
            Buat akun owner baru. Password sementara harus dikomunikasikan
            manual.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="owner@studio.com"
              autoComplete="off"
              {...register("email", {
                required: "Email wajib diisi",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Format email tidak valid",
                },
              })}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Min. 8 karakter"
                autoComplete="new-password"
                className="pr-10"
                {...register("password", {
                  required: "Password wajib diisi",
                  minLength: {
                    value: 8,
                    message: "Password minimal 8 karakter",
                  },
                  maxLength: {
                    value: 128,
                    message: "Password maksimal 128 karakter",
                  },
                })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createOwner.isPending}
            >
              Batal
            </Button>
            <Button type="submit" disabled={createOwner.isPending}>
              {createOwner.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Membuat...
                </>
              ) : (
                "Buat Owner"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Owner List Page ──────────────────────────────────────────────────────────

export default function OwnersPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const { owners, isLoading, isRefetching, error, refresh } = useOwners({
    includeDeleted: statusFilter !== "active",
  });

  // ── Client-side filtering ────────────────────────────────────────────────

  const filteredOwners = useMemo(() => {
    let result = owners;

    if (statusFilter === "active") {
      result = result.filter((o) => !o.deletedAt);
    } else if (statusFilter === "inactive") {
      result = result.filter((o) => !!o.deletedAt);
    }

    const q = searchInput.trim().toLowerCase();
    if (q) {
      result = result.filter((o) => o.email.toLowerCase().includes(q));
    }

    return result;
  }, [owners, statusFilter, searchInput]);

  // ── Pagination ───────────────────────────────────────────────────────────

  const totalPages = Math.ceil(filteredOwners.length / PAGE_SIZE);
  const paginatedOwners = filteredOwners.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  // ── Handlers ─────────────────────────────────────────────────────────────

  const clearSearch = useCallback(() => {
    setSearchInput("");
    setPage(1);
  }, []);

  const handleStatusChange = useCallback((value: StatusFilter) => {
    setStatusFilter(value);
    setPage(1);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-5 border-b border-zinc-200">
        <h1 className="text-2xl font-semibold text-zinc-950 tracking-tight">
          Owner
        </h1>
        <Button
          size="sm"
          className="bg-zinc-950 text-white hover:bg-zinc-800 shrink-0"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Buat Owner Baru
        </Button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
          <Input
            placeholder="Cari email..."
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
            }}
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

        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value as StatusFilter)}
          className="h-8 text-xs rounded-sm border border-zinc-200 bg-white px-2.5 pr-7 text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-300"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={isRefetching}
          className="h-8 text-xs gap-1.5"
        >
          <RefreshCw
            className={cn("size-3", isRefetching && "animate-spin")}
          />
        </Button>
      </div>

      {/* Error state */}
      {error && !isLoading && (
        <div className="rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
          <span className="font-medium">Gagal memuat data owner.</span>
          <button onClick={refresh} className="underline hover:text-red-900">
            Coba lagi
          </button>
        </div>
      )}

      {/* Table */}
      <div className="border border-zinc-200 rounded-sm overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider hidden md:table-cell">
                  Tgl Daftar
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {/* Loading skeleton */}
              {isLoading && (
                <>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3">
                        <Skeleton className="h-3 w-36" />
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <Skeleton className="h-3 w-28" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Skeleton className="h-3 w-16 ml-auto" />
                      </td>
                    </tr>
                  ))}
                </>
              )}

              {/* Empty state */}
              {!isLoading && filteredOwners.length === 0 && !error && (
                <tr>
                  <td colSpan={3} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center">
                        <Users className="size-4 text-zinc-400" />
                      </div>
                      <p className="text-sm font-medium text-zinc-500">
                        {searchInput.trim()
                          ? "Tidak ada owner yang cocok"
                          : "Belum ada owner"}
                      </p>
                      <p className="text-xs text-zinc-400 max-w-xs">
                        {searchInput.trim()
                          ? "Coba ubah kata kunci pencarian."
                          : "Buat owner baru untuk memulai."}
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {/* Data rows */}
              {!isLoading &&
                paginatedOwners.map((owner) => (
                  <OwnerRow
                    key={owner.id}
                    owner={owner}
                    onClick={() => router.push(`/owners/${owner.id}`)}
                  />
                ))}
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
                · {filteredOwners.length} owner
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

      {/* Create Owner Dialog */}
      <CreateOwnerDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

// ── Owner Row Component ──────────────────────────────────────────────────────

function OwnerRow({ owner, onClick }: { owner: Owner; onClick: () => void }) {
  const isActive = !owner.deletedAt;

  return (
    <tr
      onClick={onClick}
      className="hover:bg-zinc-50/50 transition-colors cursor-pointer"
    >
      <td className="px-4 py-3 align-top">
        <p className="text-sm text-zinc-700">{owner.email}</p>
      </td>
      <td className="px-4 py-3 hidden md:table-cell align-top">
        <p className="text-xs text-zinc-500">{formatDate(owner.createdAt)}</p>
      </td>
      <td className="px-4 py-3 text-right align-top">
        <div
          className={cn(
            "flex items-center justify-end gap-1.5",
            isActive ? "text-emerald-700" : "text-zinc-500",
          )}
        >
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full shrink-0",
              isActive ? "bg-emerald-500" : "bg-zinc-400",
            )}
          />
          <span className="text-xs">{isActive ? "Aktif" : "Nonaktif"}</span>
        </div>
      </td>
    </tr>
  );
}
