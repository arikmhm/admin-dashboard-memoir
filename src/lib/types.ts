// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Shared Types (Admin Dashboard)
// TypeScript interfaces aligned with backend API Contract (camelCase)
// ─────────────────────────────────────────────────────────────────────────────

// ── Enums (mirror backend DB enums) ──────────────────────────────────────────

export type UserRole = "platform_admin" | "studio_owner";
export type TxStatus = "PENDING" | "PAID" | "FAILED" | "EXPIRED";
export type PaymentMethod = "PG" | "CASH" | "STATIC_QRIS";
export type WithdrawalStatus = "PENDING" | "PROCESSED" | "REJECTED";

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  data: {
    accessToken: string;
    user: AuthUser;
  };
}

// ── Owner (Admin perspective) ────────────────────────────────────────────────

export interface Owner {
  id: string;
  email: string;
  role: UserRole;
  walletBalance: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Kiosk ────────────────────────────────────────────────────────────────────

export interface Kiosk {
  id: string;
  name: string;
  isActive: boolean;
  pairedAt: string | null;
  createdAt: string;
}

// ── Subscription Plan ────────────────────────────────────────────────────────

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  maxKiosks: number;
  priceMonthly: number;
  priceYearly: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlanRequest {
  name: string;
  description?: string;
  maxKiosks: number;
  priceMonthly: number;
  priceYearly: number;
}

export interface UpdatePlanRequest {
  name?: string;
  description?: string;
  maxKiosks?: number;
  priceMonthly?: number;
  priceYearly?: number;
  isActive?: boolean;
}

// ── Platform Config ──────────────────────────────────────────────────────────

export interface PlatformConfig {
  id: string;
  key: string;
  value: string;
  description: string | null;
  updatedBy: string | null;
  updatedAt: string;
}

export interface UpdateConfigRequest {
  value: string;
}

// ── Withdrawal ───────────────────────────────────────────────────────────────

export interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  status: WithdrawalStatus;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  rejectionNote: string | null;
  processedBy: string | null;
  processedAt: string | null;
  walletMutationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RejectWithdrawalRequest {
  rejectionNote: string;
}

// ── Transaction ──────────────────────────────────────────────────────────────

export interface Transaction {
  id: string;
  orderId: string;
  ownerId: string;
  kioskId: string;
  templateId: string;
  paymentMethod: PaymentMethod;
  qrString: string | null;
  paymentExpiresAt: string | null;
  printQty: number;
  hasDigitalCopy: boolean;
  appliedBasePrice: number;
  appliedExtraPrintPrice: number;
  appliedDigitalCopyPrice: number;
  totalAmount: number;
  status: TxStatus;
  createdAt: string;
  paidAt: string | null;
  owner?: Pick<Owner, "id" | "email">;
  kiosk?: Pick<Kiosk, "id" | "name">;
  template?: { id: string; name: string };
}

// ── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// ── Create Owner ─────────────────────────────────────────────────────────────

export interface CreateOwnerRequest {
  email: string;
  password: string;
}
