"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Settings,
  ArrowDownToLine,
  ReceiptText,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/components/auth-provider";

function SidebarToggle() {
  const { open, toggleSidebar } = useSidebar();
  return (
    <button
      onClick={toggleSidebar}
      className="absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full border border-zinc-200 bg-white shadow-sm flex items-center justify-center text-zinc-400 hover:text-zinc-950 hover:border-zinc-400 transition-colors z-20"
      aria-label={open ? "Tutup sidebar" : "Buka sidebar"}
    >
      {open ? (
        <ChevronLeft className="h-3 w-3" />
      ) : (
        <ChevronRight className="h-3 w-3" />
      )}
    </button>
  );
}

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/owners", label: "Studio Owner", icon: Users },
  { href: "/plans", label: "Subscription Plans", icon: CreditCard },
  { href: "/config", label: "Platform Config", icon: Settings },
  { href: "/withdrawals", label: "Penarikan", icon: ArrowDownToLine },
  { href: "/transactions", label: "Transaksi", icon: ReceiptText },
] as const;

export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [logoutOpen, setLogoutOpen] = useState(false);

  // Derive display info from auth context
  const displayName = user?.email?.split("@")[0] ?? "admin";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <Sidebar collapsible="icon">
      {/* Header — Logo + Toggle */}
      <SidebarHeader className="relative px-4 py-4 overflow-visible">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center pr-2">
          {/* Expanded: full logo + subtitle */}
          <span className="text-base font-semibold tracking-tight text-zinc-950 group-data-[collapsible=icon]:hidden">
            memoir<span className="text-zinc-400">.</span>
          </span>
          <span className="text-[11px] text-zinc-400 group-data-[collapsible=icon]:hidden whitespace-nowrap">
            | admin dashboard
          </span>
          {/* Collapsed: single letter */}
          <span className="hidden text-base font-semibold text-zinc-950 group-data-[collapsible=icon]:block">
            m
          </span>
        </div>
        <SidebarToggle />
      </SidebarHeader>

      <Separator />

      {/* Navigation */}
      <SidebarContent className="pt-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <Separator />

      {/* Footer — User info + Logout */}
      <SidebarFooter className="px-4 py-3">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <Avatar className="h-8 w-8 shrink-0 rounded-md">
            <AvatarFallback className="rounded-md bg-zinc-100 text-xs font-medium text-zinc-600">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-medium truncate">{displayName}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              Platform Admin
            </p>
          </div>
          <button
            onClick={() => setLogoutOpen(true)}
            className="shrink-0 text-zinc-400 hover:text-zinc-950 transition-colors group-data-[collapsible=icon]:hidden"
            aria-label="Keluar"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>

      {/* Logout Confirmation */}
      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Keluar dari akun?</DialogTitle>
            <DialogDescription>
              Kamu perlu login ulang untuk mengakses dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setLogoutOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={logout}>
              Keluar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}
