"use client";

// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Platform Config Page (FEAT-SA-05)
// Key-value config editor with inline edit modals
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  Settings,
  Pencil,
  RefreshCw,
  Loader2,
  AlertTriangle,
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
import { formatDateTime } from "@/lib/format";
import { useConfig, useUpdateConfig } from "@/hooks/use-config";
import type { PlatformConfig } from "@/lib/types";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Determine if a config key expects a numeric value */
function isNumericKey(key: string): boolean {
  return /days|amount|price|period|limit|count|max|min/i.test(key);
}

/** Human-readable key label */
function formatKey(key: string): string {
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ── Edit Config Dialog ───────────────────────────────────────────────────────

function EditConfigDialog({
  open,
  onOpenChange,
  config,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: PlatformConfig | null;
}) {
  const updateConfig = useUpdateConfig();
  const isNumeric = config ? isNumericKey(config.key) : false;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<{ value: string }>({ defaultValues: { value: "" } });

  useEffect(() => {
    if (open && config) {
      reset({ value: config.value });
    }
  }, [open, config, reset]);

  const onSubmit = async (data: { value: string }) => {
    if (!config) return;

    const trimmed = data.value.trim();

    try {
      await updateConfig.mutateAsync({ id: config.id, value: trimmed });
      toast.success("Konfigurasi berhasil diperbarui", {
        description: `${formatKey(config.key)} → ${trimmed}`,
      });
      onOpenChange(false);
    } catch (err) {
      toast.error("Gagal memperbarui konfigurasi", {
        description: err instanceof Error ? err.message : "Coba lagi nanti",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Konfigurasi</DialogTitle>
          <DialogDescription>
            {config && (
              <>
                <span className="font-mono text-xs bg-zinc-100 px-1.5 py-0.5 rounded">
                  {config.key}
                </span>
                {config.description && (
                  <span className="block mt-1 text-zinc-500">
                    {config.description}
                  </span>
                )}
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="config-value">Value *</Label>
            <Input
              id="config-value"
              type={isNumeric ? "number" : "text"}
              placeholder={isNumeric ? "0" : "Value"}
              autoComplete="off"
              {...register("value", {
                required: "Value wajib diisi",
                minLength: { value: 1, message: "Value wajib diisi" },
                validate: (v) => {
                  if (isNumeric) {
                    const n = Number(v.trim());
                    if (isNaN(n)) return "Harus berupa angka";
                    if (n < 0) return "Harus angka ≥ 0";
                  }
                  return true;
                },
              })}
            />
            {errors.value && (
              <p className="text-xs text-destructive">{errors.value.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateConfig.isPending}
            >
              Batal
            </Button>
            <Button type="submit" disabled={updateConfig.isPending}>
              {updateConfig.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Config Page ──────────────────────────────────────────────────────────────

export default function ConfigPage() {
  const { configs, isLoading, error, refresh } = useConfig();
  const [editConfig, setEditConfig] = useState<PlatformConfig | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-5 border-b border-zinc-100">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-zinc-950 tracking-tight">
            Platform Config
          </h1>
          <p className="text-sm text-zinc-500">
            Pengaturan konfigurasi platform.
            {!isLoading && (
              <span className="text-zinc-400 ml-1">
                {configs.length} konfigurasi
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

      {/* Error state */}
      {error && !isLoading && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="size-4 shrink-0" />
          <span className="font-medium">Gagal memuat konfigurasi.</span>
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
                  Key
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Value
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider hidden md:table-cell">
                  Deskripsi
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider hidden lg:table-cell">
                  Terakhir Diubah
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {/* Loading skeleton */}
              {isLoading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3">
                      <Skeleton className="h-3 w-32" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-3 w-16" />
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Skeleton className="h-3 w-48" />
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <Skeleton className="h-3 w-36" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Skeleton className="h-7 w-7 ml-auto" />
                    </td>
                  </tr>
                ))}

              {/* Empty state */}
              {!isLoading && configs.length === 0 && !error && (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center">
                        <Settings className="size-4 text-zinc-400" />
                      </div>
                      <p className="text-sm font-medium text-zinc-500">
                        Belum ada konfigurasi
                      </p>
                      <p className="text-xs text-zinc-400 max-w-xs">
                        Konfigurasi dibuat melalui database seed/migration.
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {/* Data rows */}
              {!isLoading &&
                configs.map((config) => (
                  <tr
                    key={config.id}
                    className="hover:bg-zinc-50/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="text-xs font-mono text-zinc-700 bg-zinc-50 border border-zinc-100 rounded px-1.5 py-0.5 inline-block">
                        {config.key}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-zinc-900 tabular-nums">
                        {config.value}
                      </p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-xs text-zinc-500 max-w-xs truncate">
                        {config.description || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <p className="text-xs text-zinc-500">
                        {formatDateTime(config.updatedAt)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-700"
                        onClick={() => setEditConfig(config)}
                        title={`Edit ${config.key}`}
                      >
                        <Pencil className="size-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Config Dialog */}
      <EditConfigDialog
        open={editConfig !== null}
        onOpenChange={(v) => {
          if (!v) setEditConfig(null);
        }}
        config={editConfig}
      />
    </div>
  );
}
