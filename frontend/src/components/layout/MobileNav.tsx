import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Webhook,
  Bell,
  ClipboardList,
  MoreHorizontal,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { User } from "lucide-react";

const baseItems = [
  { to: "/", icon: LayoutDashboard, label: "Inicio", exact: true },
  { to: "/schedule", icon: Calendar, label: "Turnos" },
];

const adminExtraItems = [
  { to: "/admin/webhooks", icon: Webhook, label: "Webhooks" },
  { to: "/admin/notifications", icon: Bell, label: "Notificaciones" },
  { to: "/admin/audit", icon: ClipboardList, label: "Auditoría" },
];

export function MobileNav() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";
  const isAdminOrManager = user?.role === "admin" || user?.role === "manager";
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {menuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-20 bg-black/20"
            onClick={() => setMenuOpen(false)}
          />
          <div
            id="mobile-nav-extras"
            className="md:hidden fixed bottom-16 left-0 right-0 z-30 mx-3 mb-1 rounded-2xl border border-navy-100 shadow-xl overflow-hidden"
            style={{ backgroundColor: "var(--theme-surface)" }}
            role="region"
            aria-label="Accesos de administración y cuenta"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted px-4 pt-3 pb-1">
              {isAdminOrManager ? "Administración" : "Cuenta"}
            </p>

            {isAdminOrManager && (
              <NavLink
                to="/admin/users"
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-4 py-3 text-sm font-medium border-b border-navy-50 transition-colors",
                    isActive
                      ? "text-gold-500 bg-navy-50/50"
                      : "text-theme-primary",
                  )
                }
              >
                <Users className="h-4 w-4" />
                Gestión de Usuarios
              </NavLink>
            )}

            {isAdmin &&
              adminExtraItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-4 py-3 text-sm font-medium border-b border-navy-50 transition-colors",
                      isActive
                        ? "text-gold-500 bg-navy-50/50"
                        : "text-theme-primary",
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              ))}
          </div>
        </>
      )}

      <nav
        className="md:hidden fixed bottom-0 inset-x-0 border-t border-navy-100 z-30 safe-area-bottom"
        style={{ backgroundColor: "var(--theme-surface)" }}
      >
        <div className="flex items-center justify-around h-14">
          {baseItems.map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-0.5 px-3 py-2 text-xs font-medium transition-colors",
                  isActive ? "text-navy-600" : "text-navy-300",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn("h-5 w-5", isActive && "text-gold-500")}
                  />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}

          <NavLink
            to="/profile"
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 text-xs font-medium transition-colors",
                isActive ? "text-navy-600" : "text-navy-300",
              )
            }
          >
            {({ isActive }) => (
              <>
                <User className={cn("h-5 w-5", isActive && "text-gold-500")} />
                <span>Perfil</span>
              </>
            )}
          </NavLink>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-2 text-xs font-medium transition-colors",
              menuOpen ? "text-gold-500" : "text-navy-300",
            )}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-extras"
            aria-label={menuOpen ? "Cerrar menú de administración" : "Abrir menú de administración y cuenta"}
          >
            <MoreHorizontal
              className={cn("h-5 w-5", menuOpen && "text-gold-500")}
              aria-hidden
            />
            <span>Más</span>
          </button>
        </div>
      </nav>
    </>
  );
}
