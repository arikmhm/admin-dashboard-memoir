// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Shared Types (Admin Dashboard)
// TypeScript interfaces aligned with backend API Contract (camelCase)
// ─────────────────────────────────────────────────────────────────────────────

// ── Enums (mirror backend DB enums) ──────────────────────────────────────────

export type UserRole = "platform_admin" | "studio_owner";
export type BillingPeriod = "MONTHLY" | "YEARLY";
export type SubscriptionStatus =
  | "ACTIVE"
  | "PENDING_PAYMENT"
  | "EXPIRED"
  | "CANCELLED"
  | "GRACE_PERIOD";
export type TxStatus = "PENDING" | "PAID" | "FAILED";
export type PaymentMethod = "PG" | "CASH" | "STATIC_QRIS";
export type MutationType = "CREDIT" | "DEBIT";
export type MutationCategory =
  | "TRANSACTION_INCOME"
  | "WITHDRAWAL"
  | "ADJUSTMENT";
export type WithdrawalStatus = "PENDING" | "PROCESSED" | "REJECTED";

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
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
  name: string | null;
  role: UserRole;
  walletBalance: number;
  deletedAt: string | null;
  createdAt: string;
}

export interface OwnerDetail extends Owner {
  kiosks: Kiosk[];
  recentTransactions: Transaction[];
  recentMutations: WalletMutation[];
  pendingWithdrawal: Withdrawal | null;
  subscription: OwnerSubscription | null;
}

export interface OwnerSubscription {
  id: string;
  planId: string;
  billingPeriod: BillingPeriod;
  status: SubscriptionStatus;
  pricePaid: number;
  currentPeriodEnd: string | null;
  plan?: SubscriptionPlan;
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
  ownerCount?: number;
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
  createdAt: string;
  owner?: Pick<Owner, "id" | "email" | "name" | "walletBalance">;
}

export interface RejectWithdrawalRequest {
  rejectionNote: string;
}

// ── Transaction ──────────────────────────────────────────────────────────────

export interface Transaction {
  id: string;
  orderId: string;
  userId: string;
  kioskId: string;
  templateId: string;
  paymentMethod: PaymentMethod;
  amount: number;
  status: TxStatus;
  createdAt: string;
  owner?: Pick<Owner, "id" | "email" | "name">;
  kiosk?: Pick<Kiosk, "id" | "name">;
  template?: { id: string; name: string };
}

// ── Wallet Mutation ──────────────────────────────────────────────────────────

export interface WalletMutation {
  id: string;
  userId: string;
  type: MutationType;
  category: MutationCategory;
  amount: number;
  balanceAfter: number;
  referenceId: string | null;
  description: string | null;
  createdAt: string;
}

// ── Dashboard Stats ──────────────────────────────────────────────────────────

export interface DashboardStats {
  activeOwners: number;
  expiredOrGraceOwners: number;
  todayTransactions: number;
  pendingWithdrawals: number;
  totalPlatformBalance: number;
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
  name?: string;
}
