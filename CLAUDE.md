# admin-dashboard — memoir. Super Admin Dashboard

Dashboard web untuk tim internal memoir. mengelola owner, subscription plans, platform config, withdrawal processing, dan transaction monitoring. Frontend-only app — semua data dari Backend API via Next.js rewrite proxy.

Dokumentasi platform (PRD, API docs, Postman, schema) ada di **`../memoir-docs/`**. Saat butuh referensi API contract, response shapes, atau business rules, baca dari sana — jangan duplikasi.

## Commands

```bash
npm run dev          # Dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint — zero-warning policy (--max-warnings 0)
npm run typecheck    # tsc --noEmit
```

Tidak ada test framework. CI: lint → typecheck → build.

## Tech Stack

Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS v4, shadcn/ui (New York style, zinc theme), lucide-react icons, TanStack React Query v5, react-hook-form, sonner (toasts). Package manager: npm.

Tidak ada Konva/canvas — admin dashboard murni CRUD tables + forms.

## Architecture

### API Proxy

Frontend memanggil `/api/v1/*` (relative path di `src/lib/api.ts`). `next.config.ts` rewrite ke `NEXT_PUBLIC_API_URL`. Env variable: `NEXT_PUBLIC_API_URL`.

Satu-satunya backend logic: `src/app/api/health/route.ts` — health check endpoint (`GET /api/health`) untuk readiness/liveness probe.

`next.config.ts` juga menambahkan security headers ke semua route: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`.

### Auth Flow

Sama dengan owner-dashboard, tapi role guard: **`platform_admin`** (bukan `studio_owner`).

- JWT di localStorage + synced ke cookie
- Refresh token: HttpOnly cookie (server-set)
- On 401: token refresh → retry → redirect `/login`
- Route protection: unauthenticated → `/login`, role bukan `platform_admin` → redirect

### Route Groups

- `(auth)/` — `/login` (public)
- `(dashboard)/` — semua protected routes:

| Route           | Halaman                                     |
| --------------- | ------------------------------------------- |
| `/`             | Dashboard — platform metrics overview       |
| `/owners`       | Owner list + CRUD                           |
| `/owners/:id`   | Owner detail (kiosks, transactions, wallet) |
| `/plans`        | Subscription plan list + CRUD               |
| `/config`       | Platform config key-value editor            |
| `/withdrawals`  | Withdrawal list + approve/reject            |
| `/transactions` | Cross-owner transaction monitoring          |

### Data Fetching

Hooks di `src/hooks/` wrapping TanStack Query. Semua menggunakan `src/lib/api.ts`.

### Key Files

| File                                | Peran                                                              |
| ----------------------------------- | ------------------------------------------------------------------ |
| `src/lib/api.ts`                    | API client — fetch wrapper, token management, refresh logic        |
| `src/lib/auth-api.ts`              | Auth API calls (login, logout, isAuthenticated)                    |
| `src/lib/types.ts`                  | TypeScript types yang mirror backend contract (camelCase)          |
| `src/lib/utils.ts`                  | `cn()` helper (clsx + tailwind-merge)                              |
| `src/lib/format.ts`                 | Currency (Rupiah id-ID) dan date formatting (Indonesian)           |
| `src/components/auth-provider.tsx`  | Auth context, route protection, role guard                         |
| `src/components/query-provider.tsx` | TanStack Query setup, defaultQueryFn, React Query Devtools         |
| `src/components/app-sidebar.tsx`    | Sidebar navigation, user info, logout                              |

> **Catatan:** Tidak ada file `constants.ts` — status display maps (`TX_STATUS_MAP`, `STATUS_BADGE`, `PAYMENT_METHOD_MAP`) didefinisikan inline di masing-masing page component.

## Konvensi

### Umum

- Path alias: `@/*` → `./src/*`
- Bahasa UI: **Bahasa Indonesia** — semua label, pesan error, placeholder
- Currency: Rupiah format id-ID tanpa desimal (`Rp 25.000`)
- Date: `dd MMMM yyyy` id-ID, datetime: `dd MMMM yyyy, HH:mm`
- shadcn/ui components di `src/components/ui/` — tambah via `npx shadcn@latest add <component>`
- ESLint: unused vars harus prefix `_`
- `cn()` helper (clsx + tailwind-merge) untuk conditional classNames

### API & Types

- Types di `src/lib/types.ts` HARUS match dengan response shapes di `../memoir-docs/docs/api/`
- Monetary values: number (integer Rupiah) — JANGAN pakai floating point
- IDs: string (UUID v4)
- Timestamps: string (ISO 8601)
- Nullable fields: `T | null`
- Paginated response: `{ data: T[], meta: { page, limit, total } }`

### State Management

- Server state: **TanStack Query** — queries + mutations + cache invalidation
- Form state: **react-hook-form** dengan inline `register` validation (Zod + `@hookform/resolvers` terinstall tapi belum digunakan)
- Auth state: React Context (`auth-provider.tsx`)
- UI state: `useState` lokal (modals, filters, expanded rows)

### Error Handling

- `ApiError` class di `src/lib/api.ts` — cek `error.code` untuk behavior spesifik
- 401 di-handle otomatis oleh `apiFetch` (refresh + retry + redirect)
- Form validation errors: tampilkan per-field via react-hook-form
- Toast (sonner) untuk feedback success/error pada mutations

## Business Rules (Frontend)

Aturan ini di-enforce di backend, tapi frontend juga harus handle secara UX:

### Withdrawal Processing

- Approve: tampilkan saldo owner SEBELUM approve — admin harus sadar apakah saldo cukup
- Approve bersifat ATOMIC di backend (re-cek saldo → debit → update status dalam 1 transaction)
- Transfer dana ke rekening owner dilakukan MANUAL di luar sistem — approval hanya mencatat perubahan status
- Jika saldo tidak cukup saat approve → 400 `INSUFFICIENT_BALANCE` — tampilkan toast
- Reject WAJIB isi `rejectionNote` — form harus validasi field ini required
- Withdrawal yang bukan PENDING tidak bisa di-approve/reject → 422

### Owner Management

- Create owner: admin set email + password, owner login sendiri nanti
- Soft-delete owner: set `isActive: false` — owner tidak bisa login, data histori tetap
- Restore: set `isActive: true` — hanya untuk owner yang di-soft-delete
- Email harus unique — 409 `CONFLICT` jika sudah dipakai

### Subscription Plans

- Plan hanya bisa di-nonaktifkan (`isActive: false`), TIDAK bisa di-hard-delete
- Perubahan harga plan TIDAK retroaktif — owner existing tetap pakai `pricePaid` snapshot
- Plan name harus unique — 409 `CONFLICT` jika sudah dipakai

### Platform Config

- Keys di-seed, admin hanya bisa edit VALUE — tidak bisa tambah/hapus key
- Keys penting: `grace_period_days`, `minimum_withdrawal_amount`, `default_plan_id`

### Data Scope

- Admin bisa akses data SEMUA owner — ini by design (platform management)
- Berbeda dengan owner-dashboard yang di-scope per owner_id

## Perbedaan dengan Owner Dashboard

| Aspek          | Owner Dashboard        | Admin Dashboard      |
| -------------- | ---------------------- | -------------------- |
| Role           | `studio_owner`         | `platform_admin`     |
| Data scope     | Hanya data milik owner | Semua data platform  |
| Konva/Canvas   | Ya (template editor)   | Tidak                |
| Kompleksitas   | Tinggi                 | Rendah-medium (CRUD) |
| Endpoint group | `/owner/*`             | `/admin/*`           |
| Jumlah user    | Banyak                 | Sedikit (1-5 admin)  |

## Referensi Dokumentasi

Semua dokumentasi platform ada di `../memoir-docs/`:

- PRD Admin Dashboard: `../memoir-docs/prd-memoir/PRD-03-dashboard-admin.md`
- API endpoints yang dipakai: `../memoir-docs/docs/api/admin.md`, `auth.md`
- Response shapes & error codes: `../memoir-docs/docs/api/`
- Database schema: `../memoir-docs/docs/schema/memoir_schema.dbml`

Saat integrasi atau debugging API, selalu cross-check dengan docs di atas.
