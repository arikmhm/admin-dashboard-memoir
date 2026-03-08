"use client";

// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Subscription Plan Management (FEAT-SA-04)
// Plan list table + Create/Edit modals + toggle active/inactive
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  RefreshCw,
  Loader2,
  Layers,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { formatRupiah } from "@/lib/format";
import { usePlans, useCreatePlan, useUpdatePlan } from "@/hooks/use-plans";
import { ApiError } from "@/lib/api";
import type { SubscriptionPlan, CreatePlanRequest } from "@/lib/types";

// ── Form types ───────────────────────────────────────────────────────────────

interface PlanFormValues {
  name: string;
  description: string;
  maxKiosks: string; // string for input, parsed to number on submit
  priceMonthly: string;
  priceYearly: string;
}

const EMPTY_FORM: PlanFormValues = {
  name: "",
  description: "",
  maxKiosks: "",
  priceMonthly: "",
  priceYearly: "",
};

// ── Plan Form Dialog (shared for Create & Edit) ──────────────────────────────

function PlanFormDialog({
  open,
  onOpenChange,
  plan,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: SubscriptionPlan | null; // null = create mode
}) {
  const isEdit = plan !== null;
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const isPending = createPlan.isPending || updatePlan.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setError,
  } = useForm<PlanFormValues>({
    defaultValues: EMPTY_FORM,
  });

  // Populate form when editing
  useEffect(() => {
    if (open && plan) {
      reset({
        name: plan.name,
        description: plan.description ?? "",
        maxKiosks: String(plan.maxKiosks),
        priceMonthly: String(plan.priceMonthly),
        priceYearly: String(plan.priceYearly),
      });
    } else if (open && !plan) {
      reset(EMPTY_FORM);
    }
  }, [open, plan, reset]);

  const onSubmit = async (data: PlanFormValues) => {
    const maxKiosks = parseInt(data.maxKiosks, 10);
    const priceMonthly = parseInt(data.priceMonthly, 10);
    const priceYearly = parseInt(data.priceYearly, 10);

    try {
      if (isEdit) {
        await updatePlan.mutateAsync({
          id: plan.id,
          name: data.name.trim(),
          description: data.description.trim() || undefined,
          maxKiosks,
          priceMonthly,
          priceYearly,
        });
        toast.success("Plan berhasil diperbarui");
      } else {
        const body: CreatePlanRequest = {
          name: data.name.trim(),
          maxKiosks,
          priceMonthly,
          priceYearly,
        };
        if (data.description.trim()) {
          body.description = data.description.trim();
        }
        await createPlan.mutateAsync(body);
        toast.success("Plan berhasil dibuat");
      }
      reset(EMPTY_FORM);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("name", { message: "Nama plan sudah digunakan" });
      } else {
        toast.error(isEdit ? "Gagal memperbarui plan" : "Gagal membuat plan", {
          description: err instanceof Error ? err.message : "Coba lagi nanti",
        });
      }
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset(EMPTY_FORM);
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Plan" : "Buat Plan Baru"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Perubahan harga tidak mempengaruhi subscription yang sedang berjalan."
              : "Buat tier langganan baru untuk studio owner."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Nama */}
          <div className="space-y-2">
            <Label htmlFor="plan-name">Nama Tier *</Label>
            <Input
              id="plan-name"
              placeholder="Contoh: Pro"
              autoComplete="off"
              {...register("name", {
                required: "Nama tier wajib diisi",
                minLength: { value: 1, message: "Nama tier wajib diisi" },
              })}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Deskripsi */}
          <div className="space-y-2">
            <Label htmlFor="plan-desc">Deskripsi (opsional)</Label>
            <Textarea
              id="plan-desc"
              placeholder="Deskripsi singkat plan ini"
              className="resize-none h-16"
              {...register("description")}
            />
          </div>

          {/* Max kiosks */}
          <div className="space-y-2">
            <Label htmlFor="plan-kiosks">Max Kiosk *</Label>
            <Input
              id="plan-kiosks"
              type="number"
              placeholder="3"
              min={1}
              {...register("maxKiosks", {
                required: "Max kiosk wajib diisi",
                validate: (v) => {
                  const n = parseInt(v, 10);
                  if (isNaN(n) || n < 1) return "Harus angka positif";
                  return true;
                },
              })}
            />
            {errors.maxKiosks && (
              <p className="text-xs text-destructive">
                {errors.maxKiosks.message}
              </p>
            )}
          </div>

          {/* Harga bulanan & tahunan */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="plan-monthly">Harga Bulanan (Rp) *</Label>
              <Input
                id="plan-monthly"
                type="number"
                placeholder="99000"
                min={0}
                {...register("priceMonthly", {
                  required: "Harga bulanan wajib",
                  validate: (v) => {
                    const n = parseInt(v, 10);
                    if (isNaN(n) || n < 0) return "Harus angka ≥ 0";
                    return true;
                  },
                })}
              />
              {errors.priceMonthly && (
                <p className="text-xs text-destructive">
                  {errors.priceMonthly.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-yearly">Harga Tahunan (Rp) *</Label>
              <Input
                id="plan-yearly"
                type="number"
                placeholder="990000"
                min={0}
                {...register("priceYearly", {
                  required: "Harga tahunan wajib",
                  validate: (v) => {
                    const n = parseInt(v, 10);
                    if (isNaN(n) || n < 0) return "Harus angka ≥ 0";
                    return true;
                  },
                })}
              />
              {errors.priceYearly && (
                <p className="text-xs text-destructive">
                  {errors.priceYearly.message}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEdit ? "Menyimpan..." : "Membuat..."}
                </>
              ) : isEdit ? (
                "Simpan Perubahan"
              ) : (
                "Buat Plan"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Plans Page ───────────────────────────────────────────────────────────────

export default function PlansPage() {
  const { plans, isLoading, error, refresh } = usePlans();
  const updatePlan = useUpdatePlan();
  const [createOpen, setCreateOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<SubscriptionPlan | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleToggle = async (plan: SubscriptionPlan) => {
    setTogglingId(plan.id);
    try {
      await updatePlan.mutateAsync({
        id: plan.id,
        isActive: !plan.isActive,
      });
      toast.success(
        plan.isActive ? "Plan dinonaktifkan" : "Plan diaktifkan kembali",
        {
          description: plan.isActive
            ? "Plan tidak bisa dipilih owner baru."
            : "Plan kembali tersedia untuk owner baru.",
        },
      );
    } catch (err) {
      toast.error("Gagal mengubah status plan", {
        description: err instanceof Error ? err.message : "Coba lagi nanti",
      });
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-5 border-b border-zinc-100">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-zinc-950 tracking-tight">
            Subscription Plans
          </h1>
          <p className="text-sm text-zinc-500">
            Kelola tier langganan platform.
            {!isLoading && (
              <span className="text-zinc-400 ml-1">
                {plans.length} plan terdaftar
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className={cn("size-3", isLoading && "animate-spin")} />
          </Button>
          <Button
            size="sm"
            className="bg-zinc-950 text-white hover:bg-zinc-800"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Buat Plan Baru
          </Button>
        </div>
      </div>

      {/* Error state */}
      {error && !isLoading && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
          <span className="font-medium">Gagal memuat data plan.</span>
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
                  Nama Tier
                </th>
                <th className="text-center px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Max Kiosk
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider hidden sm:table-cell">
                  Harga Bulanan
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider hidden md:table-cell">
                  Harga Tahunan
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
              {isLoading && (
                <>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-2.5 w-40 mt-1.5" />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Skeleton className="h-3 w-6 mx-auto" />
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        <Skeleton className="h-3 w-20 ml-auto" />
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <Skeleton className="h-3 w-24 ml-auto" />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Skeleton className="h-5 w-14 rounded-full mx-auto" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Skeleton className="h-7 w-16 ml-auto" />
                      </td>
                    </tr>
                  ))}
                </>
              )}

              {/* Empty state */}
              {!isLoading && plans.length === 0 && !error && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center">
                        <Layers className="size-4 text-zinc-400" />
                      </div>
                      <p className="text-sm font-medium text-zinc-500">
                        Belum ada subscription plan
                      </p>
                      <p className="text-xs text-zinc-400 max-w-xs">
                        Buat plan pertama untuk memulai.
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {/* Data rows */}
              {!isLoading &&
                plans.map((plan) => (
                  <tr
                    key={plan.id}
                    className={cn(
                      "hover:bg-zinc-50/50 transition-colors",
                      !plan.isActive && "opacity-60",
                    )}
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-zinc-900">
                        {plan.name}
                      </p>
                      {plan.description && (
                        <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
                          {plan.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-medium text-zinc-700 tabular-nums">
                        {plan.maxKiosks}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                      <span className="text-sm text-zinc-700 tabular-nums">
                        {formatRupiah(plan.priceMonthly)}
                      </span>
                      <span className="text-[10px] text-zinc-400">/bln</span>
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      <span className="text-sm text-zinc-700 tabular-nums">
                        {formatRupiah(plan.priceYearly)}
                      </span>
                      <span className="text-[10px] text-zinc-400">/thn</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        className={cn(
                          "text-[10px]",
                          plan.isActive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-zinc-100 text-zinc-500 border-zinc-200",
                        )}
                      >
                        {plan.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-700"
                          onClick={() => setEditPlan(plan)}
                          title="Edit plan"
                        >
                          <Pencil className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "h-7 w-7 p-0",
                            plan.isActive
                              ? "text-zinc-400 hover:text-red-600"
                              : "text-zinc-400 hover:text-emerald-600",
                          )}
                          onClick={() => handleToggle(plan)}
                          disabled={togglingId === plan.id}
                          title={
                            plan.isActive ? "Nonaktifkan plan" : "Aktifkan plan"
                          }
                        >
                          {togglingId === plan.id ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : plan.isActive ? (
                            <ToggleRight className="size-3.5" />
                          ) : (
                            <ToggleLeft className="size-3.5" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Plan Dialog */}
      <PlanFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        plan={null}
      />

      {/* Edit Plan Dialog */}
      <PlanFormDialog
        open={editPlan !== null}
        onOpenChange={(v) => {
          if (!v) setEditPlan(null);
        }}
        plan={editPlan}
      />
    </div>
  );
}
