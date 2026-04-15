import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Palette, RotateCcw, Save } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/config/api";
import { DEFAULT_THEME, applyThemeToDocument } from "@/config/theme";
import { useUIStore } from "@/store/uiStore";
import type { ThemeConfig, ThemeLogoVariant, ThemePreset } from "@/types";
import LogoClaro from "@/assets/Logo_Claro.png";
import LogoOscuro from "@/assets/Logo_Oscuro.png";
import { getApiErrorDetails, getApiErrorMessage } from '@/lib/apiError';

interface ThemeContrastViolation {
  component: string;
  label: string;
  ratio: number;
  minRatio: number;
  message?: string;
}

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorField({ label, value, onChange }: ColorFieldProps) {
  return (
    <label className="flex items-center justify-between gap-3 p-2 rounded-lg border border-theme-color bg-theme-surface">
      <span className="text-xs text-theme-text-muted font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-8 rounded border border-theme-border-color cursor-pointer"
        />
        <span className="text-xs text-theme-text-muted uppercase w-16 text-right">
          {value}
        </span>
      </div>
    </label>
  );
}

function cloneTheme(theme: ThemeConfig) {
  return JSON.parse(JSON.stringify(theme)) as ThemeConfig;
}

const logoOptions: Array<{
  value: ThemeLogoVariant;
  label: string;
  description: string;
  preview: string;
}> = [
  {
    value: "logo_claro",
    label: "Logo Claro",
    description: "Ideal para fondos oscuros",
    preview: LogoClaro,
  },
  {
    value: "logo_oscuro",
    label: "Logo Oscuro",
    description: "Ideal para fondos claros",
    preview: LogoOscuro,
  },
];

export function ThemeManagerPage() {
  const queryClient = useQueryClient();
  const { themeConfig, setThemeConfig } = useUIStore();
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    themeConfig?.preset || "",
  );

  const [editingTheme, setEditingTheme] = useState<ThemeConfig | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const activeTheme = editingTheme || themeConfig || DEFAULT_THEME;

  const { data: presets = [] } = useQuery({
    queryKey: ["theme-presets"],
    queryFn: () =>
      api
        .get<{ data: ThemePreset[] }>("/settings/theme/presets")
        .then((r) => r.data.data),
  });

  // Inicializar una sola vez con el tema actual del store
  useEffect(() => {
    if (!isInitialized && themeConfig) {
      setEditingTheme(null); // null = usar themeConfig
      setIsInitialized(true);
    }
  }, [isInitialized, themeConfig]);

  const publishMutation = useMutation({
    mutationFn: (theme: ThemeConfig) =>
      api.put<{ data: ThemeConfig }>("/settings/theme", theme),
    onSuccess: (response) => {
      setThemeConfig(response.data.data);
      setEditingTheme(null); // Sincronizar editingTheme con el tema publicado
      queryClient.invalidateQueries({ queryKey: ["theme-settings"] });
      toast.success("Tema global publicado");
    },
    onError: (error: unknown) => {
      const details = getApiErrorDetails<{
        violations?: ThemeContrastViolation[] | string[];
        violationMessages?: string[];
      }>(error);
      const violations = details?.violations;
      if (Array.isArray(violations) && violations.length > 0) {
        const first = violations[0];
        if (typeof first === "string") {
          toast.error(`Contraste no valido: ${first}`);
          return;
        }

        const extras = violations.length - 1;
        const extraText = extras > 0 ? ` (+${extras} regla(s) mas)` : "";
        toast.error(
          `Contraste no valido en ${first.component}: ${first.label} (${first.ratio.toFixed(2)}:1, min ${first.minRatio}:1)${extraText}`,
        );
        return;
      }
      toast.error(getApiErrorMessage(error, 'No se pudo publicar el tema'));
    },
  });

  const presetOptions = useMemo(
    () =>
      presets.map((preset) => ({
        id: preset.id,
        name: preset.name,
        description: preset.description,
        theme: preset.theme,
      })),
    [presets],
  );

  const setColor = (path: string[], value: string) => {
    const draft = cloneTheme(activeTheme);
    let target: Record<string, unknown> = draft as unknown as Record<
      string,
      unknown
    >;
    for (let i = 0; i < path.length - 1; i += 1) {
      target = target[path[i]] as Record<string, unknown>;
    }
    target[path[path.length - 1]] = value;
    setEditingTheme(draft);
    applyThemeToDocument(draft);
    setThemeConfig(draft); // Sincronizar inmediatamente en el store
  };

  const applyPreset = (presetId: string) => {
    const preset = presetOptions.find((item) => item.id === presetId);
    if (!preset) return;
    const nextTheme = cloneTheme({
      ...preset.theme,
      preset: preset.id as ThemeConfig["preset"],
    });
    setEditingTheme(nextTheme);
    applyThemeToDocument(nextTheme);
    setThemeConfig(nextTheme); // Sincronizar inmediatamente en el store
  };

  const setLogoVariant = (logoVariant: ThemeLogoVariant) => {
    const draft = cloneTheme(activeTheme);
    draft.overrides.sidebar.logoVariant = logoVariant;
    setEditingTheme(draft);
    applyThemeToDocument(draft);
    setThemeConfig(draft); // Sincronizar inmediatamente en el store
  };

  const handleReset = () => {
    setEditingTheme(null); // null = usar themeConfig
    applyThemeToDocument(themeConfig || DEFAULT_THEME);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-theme-text-primary">
            Tema Global
          </h1>
          <p className="text-sm text-theme-text-muted mt-0.5">
            Personaliza colores globales y publica cambios para toda la
            aplicación
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="btn-ghost text-sm flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Restablecer
          </button>
          <button
            onClick={() => publishMutation.mutate(activeTheme)}
            disabled={publishMutation.isPending}
            className="btn-primary text-sm flex items-center gap-2 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            Publicar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 card p-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-theme-text-muted mb-2">
              Preset
            </label>
            <div className="flex gap-2">
              <select
                value={selectedPresetId}
                onChange={(e) => setSelectedPresetId(e.target.value)}
                className="input-field text-sm flex-1"
              >
                {presetOptions.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => applyPreset(selectedPresetId)}
                className="btn-primary text-sm px-4 flex items-center gap-2"
              >
                <Palette className="h-4 w-4" />
                Aplicar
              </button>
            </div>
            <p className="text-xs text-theme-text-muted mt-2">
              {presetOptions.find((item) => item.id === selectedPresetId)
                ?.description || "Preset personalizado"}
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-theme-text-primary">
              Sidebar
            </h2>
            <div className="max-w-2xl">
              <label className="block text-xs font-medium text-theme-text-muted mb-2">
                Logo del Sidebar
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {logoOptions.map((option) => (
                  <label
                    key={option.value}
                    className="cursor-pointer rounded-xl border p-3 transition-all"
                    style={{
                      borderColor:
                        activeTheme.overrides.sidebar.logoVariant ===
                        option.value
                          ? activeTheme.overrides.sidebar.activeBackground
                          : activeTheme.tokens.borderColor,
                      backgroundColor: activeTheme.tokens.surface,
                    }}
                  >
                    <input
                      type="radio"
                      name="sidebar-logo-variant"
                      value={option.value}
                      checked={
                        activeTheme.overrides.sidebar.logoVariant ===
                        option.value
                      }
                      onChange={(e) =>
                        setLogoVariant(e.target.value as ThemeLogoVariant)
                      }
                      className="sr-only"
                    />
                    <div className="space-y-2">
                      <div
                        className="rounded-lg border p-2"
                        style={{
                          backgroundColor:
                            option.value === "logo_oscuro"
                              ? "#ffffff"
                              : "#0b1220",
                          borderColor:
                            option.value === "logo_oscuro"
                              ? "#cbd5e1"
                              : "#334155",
                        }}
                      >
                        <img
                          src={option.preview}
                          alt={option.label}
                          className="h-10 w-full object-contain"
                          draggable={false}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-theme-text-primary">
                          {option.label}
                        </p>
                        <p className="text-xs text-theme-text-muted">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <ColorField
                label="Fondo"
                value={activeTheme.overrides.sidebar.background}
                onChange={(v) =>
                  setColor(["overrides", "sidebar", "background"], v)
                }
              />
              <ColorField
                label="Texto"
                value={activeTheme.overrides.sidebar.text}
                onChange={(v) => setColor(["overrides", "sidebar", "text"], v)}
              />
              <ColorField
                label="Item activo"
                value={activeTheme.overrides.sidebar.activeBackground}
                onChange={(v) =>
                  setColor(["overrides", "sidebar", "activeBackground"], v)
                }
              />
              <ColorField
                label="Texto activo"
                value={activeTheme.overrides.sidebar.activeText}
                onChange={(v) =>
                  setColor(["overrides", "sidebar", "activeText"], v)
                }
              />
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-theme-text-primary">
              TopBar y botones
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <ColorField
                label="TopBar fondo"
                value={activeTheme.overrides.topbar.background}
                onChange={(v) =>
                  setColor(["overrides", "topbar", "background"], v)
                }
              />
              <ColorField
                label="TopBar texto"
                value={activeTheme.overrides.topbar.text}
                onChange={(v) => setColor(["overrides", "topbar", "text"], v)}
              />
              <ColorField
                label="Botón primario"
                value={activeTheme.overrides.buttons.primaryBackground}
                onChange={(v) =>
                  setColor(["overrides", "buttons", "primaryBackground"], v)
                }
              />
              <ColorField
                label="Texto botón primario"
                value={activeTheme.overrides.buttons.primaryText}
                onChange={(v) =>
                  setColor(["overrides", "buttons", "primaryText"], v)
                }
              />
              <ColorField
                label="Botón secundario"
                value={activeTheme.overrides.buttons.secondaryBackground}
                onChange={(v) =>
                  setColor(["overrides", "buttons", "secondaryBackground"], v)
                }
              />
              <ColorField
                label="Botón peligro"
                value={activeTheme.overrides.buttons.dangerBackground}
                onChange={(v) =>
                  setColor(["overrides", "buttons", "dangerBackground"], v)
                }
              />
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-theme-text-primary">
              Badges
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <ColorField
                label="Badge admin"
                value={activeTheme.overrides.badges.adminBackground}
                onChange={(v) =>
                  setColor(["overrides", "badges", "adminBackground"], v)
                }
              />
              <ColorField
                label="Badge manager"
                value={activeTheme.overrides.badges.managerBackground}
                onChange={(v) =>
                  setColor(["overrides", "badges", "managerBackground"], v)
                }
              />
              <ColorField
                label="Badge viewer"
                value={activeTheme.overrides.badges.viewerBackground}
                onChange={(v) =>
                  setColor(["overrides", "badges", "viewerBackground"], v)
                }
              />
              <ColorField
                label="Badge activo"
                value={activeTheme.overrides.badges.activeBackground}
                onChange={(v) =>
                  setColor(["overrides", "badges", "activeBackground"], v)
                }
              />
              <ColorField
                label="Badge bloqueado"
                value={activeTheme.overrides.badges.lockedBackground}
                onChange={(v) =>
                  setColor(["overrides", "badges", "lockedBackground"], v)
                }
              />
              <ColorField
                label="Badge deshabilitado"
                value={activeTheme.overrides.badges.disabledBackground}
                onChange={(v) =>
                  setColor(["overrides", "badges", "disabledBackground"], v)
                }
              />
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-theme-text-primary">
              Calendario y toasts
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <ColorField
                label="Hoy (calendario)"
                value={activeTheme.overrides.calendar.todayBackground}
                onChange={(v) =>
                  setColor(["overrides", "calendar", "todayBackground"], v)
                }
              />
              <ColorField
                label="Botón activo calendario"
                value={activeTheme.overrides.calendar.activeButtonBackground}
                onChange={(v) =>
                  setColor(
                    ["overrides", "calendar", "activeButtonBackground"],
                    v,
                  )
                }
              />
              <ColorField
                label="Indicador hora actual"
                value={activeTheme.overrides.calendar.nowIndicator}
                onChange={(v) =>
                  setColor(["overrides", "calendar", "nowIndicator"], v)
                }
              />
              <ColorField
                label="Toast fondo"
                value={activeTheme.overrides.toasts.background}
                onChange={(v) =>
                  setColor(["overrides", "toasts", "background"], v)
                }
              />
              <ColorField
                label="Toast texto"
                value={activeTheme.overrides.toasts.text}
                onChange={(v) => setColor(["overrides", "toasts", "text"], v)}
              />
              <ColorField
                label="Toast error"
                value={activeTheme.overrides.toasts.errorBackground}
                onChange={(v) =>
                  setColor(["overrides", "toasts", "errorBackground"], v)
                }
              />
            </div>
          </div>
        </div>

        <div className="card p-5 space-y-4 h-fit">
          <h2 className="text-sm font-semibold text-theme-text-primary">
            Vista previa rápida
          </h2>

          <div
            className="rounded-xl p-4"
            style={{
              backgroundColor: activeTheme.overrides.sidebar.background,
            }}
          >
            <p
              className="text-xs font-semibold"
              style={{ color: activeTheme.overrides.sidebar.text }}
            >
              Sidebar
            </p>
            <p
              className="text-[11px] mt-1"
              style={{ color: activeTheme.overrides.sidebar.text }}
            >
              {activeTheme.overrides.sidebar.logoVariant === "logo_claro"
                ? "Logo Claro"
                : "Logo Oscuro"}
            </p>
            <div
              className="mt-2 rounded-md px-3 py-2 text-xs font-semibold"
              style={{
                backgroundColor: activeTheme.overrides.sidebar.activeBackground,
                color: activeTheme.overrides.sidebar.activeText,
              }}
            >
              Item activo
            </div>
          </div>

          <div
            className="rounded-xl border p-4"
            style={{
              borderColor: activeTheme.tokens.borderColor,
              backgroundColor: activeTheme.tokens.surface,
            }}
          >
            <p
              className="text-xs"
              style={{ color: activeTheme.tokens.textPrimary }}
            >
              Texto principal
            </p>
            <p
              className="text-xs mt-1"
              style={{ color: activeTheme.tokens.textMuted }}
            >
              Texto secundario
            </p>
            <button
              className="mt-3 text-xs font-semibold px-3 py-2 rounded-md"
              style={{
                backgroundColor:
                  activeTheme.overrides.buttons.primaryBackground,
                color: activeTheme.overrides.buttons.primaryText,
              }}
            >
              Botón primario
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <span
              className="px-2 py-1 rounded-full text-center font-semibold"
              style={{
                backgroundColor: activeTheme.overrides.badges.adminBackground,
                color: activeTheme.overrides.badges.adminText,
              }}
            >
              Admin
            </span>
            <span
              className="px-2 py-1 rounded-full text-center font-semibold"
              style={{
                backgroundColor: activeTheme.overrides.badges.activeBackground,
                color: activeTheme.overrides.badges.activeText,
              }}
            >
              Activo
            </span>
          </div>

          <div
            className="rounded-lg p-3 text-xs"
            style={{
              backgroundColor: activeTheme.overrides.toasts.background,
              color: activeTheme.overrides.toasts.text,
            }}
          >
            <div className="flex items-center gap-2 font-semibold">
              <Check className="h-4 w-4" />
              Toast preview
            </div>
            <p className="mt-1 opacity-90">
              Notificación de ejemplo con los colores actuales.
            </p>
          </div>

          <div className="rounded-lg p-3 text-xs border border-dashed border-theme-border-color bg-theme-surface-muted text-theme-text-muted flex items-start gap-2">
            <Palette className="h-4 w-4 mt-0.5" />
            <p>
              La vista previa se aplica en vivo al resto de la aplicación
              mientras editas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
