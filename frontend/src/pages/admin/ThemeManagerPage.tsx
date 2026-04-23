import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Palette,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  X,
  Pencil,
  Globe,
  UploadCloud,
  FileImage,
} from "lucide-react";
import { useRef, useCallback } from "react";
import toast from "react-hot-toast";
import api from "@/config/api";
import { DEFAULT_THEME, applyThemeToDocument } from "@/config/theme";
import { useUIStore } from "@/store/uiStore";
import type { ThemeConfig, ThemeLogoVariant, ThemePreset } from "@/types";
import LogoClaro from "@/assets/Logo_Claro.png";
import LogoOscuro from "@/assets/Logo_Oscuro.png";
import { getApiErrorDetails, getApiErrorMessage } from "@/lib/apiError";
import { applyFavicon } from "@/lib/favicon";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ExtendedThemePreset extends ThemePreset {
  isBase: boolean;
}

interface ThemeContrastViolation {
  component: string;
  label: string;
  ratio: number;
  minRatio: number;
  message?: string;
}

// ─── Color field with hex input ───────────────────────────────────────────────

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorField({ label, value, onChange }: ColorFieldProps) {
  // 1. Estado local para lo que el usuario escribe (permite borrar y escribir)
  const [hexInput, setHexInput] = useState(value);
  
  // 2. Sincronización inteligente: Si la prop 'value' cambia desde fuera (ej: cambias de preset),
  // actualizamos el input local. Esto es más eficiente que useEffect en React 19.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setHexInput(value);
    setPrevValue(value);
  }

  const isValidHex = (v: string) => /^#[0-9A-Fa-f]{6}$/.test(v);

  const handleHexChange = (raw: string) => {
    let v = raw;
    if (v.length > 0 && !v.startsWith('#')) v = '#' + v;
    setHexInput(v);
    
    // Solo notificamos al padre si el color es válido y completo
    if (isValidHex(v)) {
      onChange(v.toUpperCase());
    }
  };

  const handleHexBlur = () => {
    if (!isValidHex(hexInput)) {
      // Si al salir el campo es inválido, revertimos al último valor real
      setHexInput(value);
    } else {
      setHexInput(hexInput.toUpperCase());
    }
  };

  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value.toUpperCase();
    setHexInput(newVal); // Actualizamos localmente
    onChange(newVal);    // Notificamos al padre
  };

  const hexInvalid = hexInput.length > 1 && !isValidHex(hexInput);

  return (
    <div
      className={`flex items-center justify-between gap-3 p-2 rounded-lg border bg-theme-surface ${
        hexInvalid ? "border-red-400" : "border-theme-color"
      }`}
    >
      <span className="text-xs text-theme-muted font-medium truncate flex-1 min-w-0">{label}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="relative">
          <div
            className="h-7 w-7 rounded border border-theme-color cursor-pointer shrink-0 overflow-hidden"
            style={{ backgroundColor: isValidHex(hexInput) ? hexInput : value }}
          >
            <input
              type="color"
              value={isValidHex(value) ? value : '#000000'}
              onChange={handleColorPickerChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              title="Abrir selector de color"
            />
          </div>
        </div>
        <input
          type="text"
          value={hexInput}
          onChange={(e) => handleHexChange(e.target.value)}
          onBlur={handleHexBlur}
          maxLength={7}
          placeholder="#000000"
          spellCheck={false}
          className={`w-20.5 text-xs font-mono px-2 py-1.5 rounded border bg-theme-surface text-theme-primary transition-colors uppercase ${
            hexInvalid
              ? "border-red-400 focus:border-red-500"
              : "border-theme-color focus:border-theme-text-muted"
          }`}
        />
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

const BASE_PRESET_IDS = ["light", "corporate", "dark"];

function isBasePreset(id: string) {
  return BASE_PRESET_IDS.includes(id);
}

function isPersistedCustomPreset(id: string) {
  return id.startsWith("custom_");
}

// ─── Create Preset Modal ──────────────────────────────────────────────────────

interface CreatePresetModalProps {
  baseTheme: ThemeConfig;
  onClose: () => void;
  onCreated: (preset: ExtendedThemePreset) => void;
}

function CreatePresetModal({ baseTheme, onClose, onCreated }: CreatePresetModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const mutation = useMutation({
    mutationFn: (data: {
      name: string;
      description: string;
      tokens: ThemeConfig["tokens"];
      overrides: ThemeConfig["overrides"];
    }) =>
      api
        .post<{ data: ExtendedThemePreset }>("settings/theme/presets", data)
        .then((r) => r.data.data),
    onSuccess: (preset) => {
      queryClient.invalidateQueries({ queryKey: ["theme-presets"] });
      toast.success(`Preset "${preset.name}" creado`);
      onCreated(preset);
      onClose();
    },
    onError: (error: unknown) => {
      const details = getApiErrorDetails<{ violations?: ThemeContrastViolation[] }>(error);
      if (details?.violations?.length) {
        const v = details.violations[0];
        toast.error(`Contraste insuficiente: ${v.label} (${v.ratio.toFixed(2)}:1)`);
        return;
      }
      toast.error(getApiErrorMessage(error, "Error al crear preset"));
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in">
      <div className="card rounded-2xl shadow-2xl w-full max-w-sm animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme-color">
          <h2 className="text-base font-semibold text-theme-primary flex items-center gap-2">
            <Plus className="h-4 w-4 text-gold-500" />
            Nuevo Preset Personalizado
          </h2>
          <button onClick={onClose} className="p-1.5 text-theme-muted hover:text-theme-primary rounded-lg">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-xs text-theme-muted">
            Se creará un preset basado en los colores actuales que podrás editar libremente.
          </p>
          <div>
            <label className="block text-sm font-medium text-theme-muted mb-1">Nombre *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="Ej: Mi Preset Corporativo"
              maxLength={40}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-muted mb-1">Descripción</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field"
              placeholder="Descripción breve del preset"
              maxLength={80}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-ghost text-sm">Cancelar</button>
            <button
              onClick={() =>
                mutation.mutate({
                  name: name.trim(),
                  description: description.trim(),
                  tokens: baseTheme.tokens,
                  overrides: baseTheme.overrides,
                })
              }
              disabled={!name.trim() || mutation.isPending}
              className="flex-1 btn-primary text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {mutation.isPending && <LoadingSpinner size="sm" className="border-white border-t-white/30" />}
              Crear Preset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface RenamePresetModalProps {
  preset: ExtendedThemePreset;
  onClose: () => void;
  onRenamed: (preset: ExtendedThemePreset) => void;
}

function RenamePresetModal({ preset, onClose, onRenamed }: RenamePresetModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(preset.name);
  const [description, setDescription] = useState(preset.description || "");

  const mutation = useMutation({
    mutationFn: (data: { name: string; description: string }) =>
      api
        .patch<{ data: ExtendedThemePreset }>(`settings/theme/presets/${preset.id}`, data)
        .then((r) => r.data.data),
    onSuccess: (updatedPreset) => {
      queryClient.invalidateQueries({ queryKey: ["theme-presets"] });
      toast.success(`Preset renombrado a "${updatedPreset.name}"`);
      onRenamed(updatedPreset);
      onClose();
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, "Error al renombrar preset"));
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in">
      <div className="card rounded-2xl shadow-2xl w-full max-w-sm animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme-color">
          <h2 className="text-base font-semibold text-theme-primary">Renombrar Preset</h2>
          <button onClick={onClose} className="p-1.5 text-theme-muted hover:text-theme-primary rounded-lg">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-theme-muted mb-1">Nombre *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="Ej: Mi Preset Corporativo"
              maxLength={40}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-muted mb-1">Descripción</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field"
              placeholder="Descripción breve del preset"
              maxLength={80}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-ghost text-sm">Cancelar</button>
            <button
              onClick={() => mutation.mutate({ name: name.trim(), description: description.trim() })}
              disabled={!name.trim() || mutation.isPending}
              className="flex-1 btn-primary text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {mutation.isPending && <LoadingSpinner size="sm" className="border-white border-t-white/30" />}
              Guardar nombre
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ThemeManagerPage() {
  const qc = useQueryClient();
  const { themeConfig, themeDraft, setThemeConfig, setThemeDraft, resetDraft } = useUIStore();
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    themeDraft?.preset || themeConfig?.preset || ""
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renamePreset, setRenamePreset] = useState<ExtendedThemePreset | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ExtendedThemePreset | null>(null);

  // ── Site branding state ────────────────────────────────────────
  const [siteTitleDraft, setSiteTitleDraft] = useState<string | null>(null);
  const [siteFaviconUrlDraft, setSiteFaviconUrlDraft] = useState<string | null>(null);
  const [brandingSaved, setBrandingSaved] = useState(false);

  const { data: siteData } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () =>
      api
        .get<{ data: { title: string; faviconUrl: string } }>('settings/site')
        .then((r) => r.data.data),
  });

  const siteTitle = siteTitleDraft ?? siteData?.title ?? '';
  const siteFaviconUrl = siteFaviconUrlDraft ?? siteData?.faviconUrl ?? '';

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFaviconMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('favicon', file);
      return api.post<{ data: { faviconUrl: string } }>('settings/upload-favicon', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: (res) => {
      const url = res.data.data.faviconUrl;
      setSiteFaviconUrlDraft(url);
      applyFavicon(url, { cacheBust: true });
      toast.success('Favicon subido correctamente');
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Error al subir el favicon'));
    },
  });

  const handleFaviconFile = useCallback((file: File) => {
    const allowed = ['image/x-icon', 'image/png', 'image/svg+xml', 'image/jpeg', 'image/webp', 'image/gif'];
    // Also accept by extension in case MIME is generic
    const ext = file.name.split('.').pop()?.toLowerCase();
    const allowedExt = ['ico', 'png', 'svg', 'jpg', 'jpeg', 'webp', 'gif'];
    if (!allowed.includes(file.type) && !allowedExt.includes(ext ?? '')) {
      toast.error('Formato no permitido. Usa ICO, PNG, SVG, JPG o WEBP.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('El archivo no puede superar 2 MB.');
      return;
    }
    uploadFaviconMutation.mutate(file);
  }, [uploadFaviconMutation]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFaviconFile(file);
  }, [handleFaviconFile]);

  const saveBrandingMutation = useMutation({
    mutationFn: (data: { title: string; faviconUrl: string }) =>
      api.put('settings/site', data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['site-settings'] });
      document.title = vars.title;
      applyFavicon(vars.faviconUrl, { cacheBust: true });
      setBrandingSaved(true);
      setTimeout(() => setBrandingSaved(false), 2500);
      toast.success('Configuración del sitio guardada');
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Error al guardar configuración'));
    },
  });

  const activeTheme = themeDraft || themeConfig || DEFAULT_THEME;

  const { data: presetsRaw = [] } = useQuery({
    queryKey: ["theme-presets"],
    queryFn: () =>
      api
        .get<{ data: ExtendedThemePreset[] }>("settings/theme/presets")
        .then((r) => r.data.data),
  });

  const presets: ExtendedThemePreset[] = useMemo(
    () => presetsRaw.map((p) => ({ ...p, isBase: isBasePreset(p.id) })),
    [presetsRaw]
  );

  useEffect(() => {
    if (!selectedPresetId) return;
    const preset = presets.find((p) => p.id === selectedPresetId);
    if (!preset) return;
    if (themeDraft?.preset === selectedPresetId) return;

    const nextTheme = cloneTheme({
      ...preset.theme,
      preset: preset.id as ThemeConfig["preset"],
    });
    setThemeDraft(nextTheme);
  }, [selectedPresetId, presets, setThemeDraft, themeDraft?.preset]);

  const selectedPreset = presets.find((p) => p.id === selectedPresetId) ?? null;
  const isSelectedPersistedCustom = selectedPreset
    ? isPersistedCustomPreset(selectedPreset.id)
    : false;

  // ── Mutations ──────────────────────────────────────────────────────────────

  const publishMutation = useMutation({
    mutationFn: (theme: ThemeConfig) =>
      api.put<{ data: ThemeConfig }>("settings/theme", theme),
    onSuccess: (response) => {
      setThemeConfig(response.data.data);
      setSelectedPresetId(response.data.data.preset);
      qc.invalidateQueries({ queryKey: ["theme-presets"] });
      toast.success("Apariencia guardada y publicada");
    },
    onError: (error: unknown) => {
      const details = getApiErrorDetails<{
        violations?: ThemeContrastViolation[];
        violationMessages?: string[];
      }>(error);
      const violations = details?.violations;
      if (Array.isArray(violations) && violations.length > 0) {
        const first = violations[0];
        if (typeof first !== "string") {
          const extras = violations.length - 1;
          const extraText = extras > 0 ? ` (+${extras} más)` : "";
          toast.error(
            `Contraste no válido en ${first.component}: ${first.label} (${first.ratio.toFixed(2)}:1, min ${first.minRatio}:1)${extraText}`
          );
          return;
        }
      }
      toast.error(getApiErrorMessage(error, "No se pudo guardar el tema"));
    },
  });

  const saveCustomMutation = useMutation({
    mutationFn: ({ id, theme }: { id: string; theme: ThemeConfig }) =>
      api.patch<{ data: ExtendedThemePreset }>(`settings/theme/presets/${id}`, {
        tokens: theme.tokens,
        overrides: theme.overrides,
      }),
    onSuccess: (response) => {
      qc.invalidateQueries({ queryKey: ["theme-presets"] });
      setThemeDraft(response.data.data.theme);
      toast.success(`Preset "${response.data.data.name}" guardado`);
    },
    onError: (error: unknown) => {
      const details = getApiErrorDetails<{ violations?: ThemeContrastViolation[] }>(error);
      if (details?.violations?.length) {
        const v = details.violations[0];
        toast.error(`Contraste insuficiente: ${v.label} (${v.ratio.toFixed(2)}:1)`);
        return;
      }
      toast.error(getApiErrorMessage(error, "Error al guardar preset"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`settings/theme/presets/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["theme-presets"] });
      if (deleteConfirm?.id === selectedPresetId) {
        const fallback = themeConfig || DEFAULT_THEME;
        setSelectedPresetId(fallback.preset);
        setThemeDraft(null);
        applyThemeToDocument(fallback);
      }
      setDeleteConfirm(null);
      toast.success("Preset eliminado");
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, "Error al eliminar preset"));
    },
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  const setColor = (path: string[], value: string) => {
    const draft = cloneTheme(activeTheme);
    let target: Record<string, unknown> = draft as unknown as Record<string, unknown>;
    for (let i = 0; i < path.length - 1; i++) {
      target = target[path[i]] as Record<string, unknown>;
    }
    target[path[path.length - 1]] = value;
    setThemeDraft(draft);
  };

  const applyPreset = (presetId: string) => {
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return;
    setSelectedPresetId(presetId);
    const nextTheme = cloneTheme({
      ...preset.theme,
      preset: preset.id as ThemeConfig["preset"],
    });
    setThemeDraft(nextTheme);
    setThemeConfig(nextTheme);
    applyThemeToDocument(nextTheme);
    toast.success("Tema aplicado");
  };

  const setLogoVariant = (logoVariant: ThemeLogoVariant) => {
    const draft = cloneTheme(activeTheme);
    draft.overrides.sidebar.logoVariant = logoVariant;
    setThemeDraft(draft);
  };

  const handleReset = () => {
    const publishedTheme = themeConfig || DEFAULT_THEME;
    resetDraft();
    setSelectedPresetId(publishedTheme.preset);
  };

  const handlePublish = () => {
    if (selectedPreset && themeDraft && isSelectedPersistedCustom) {
      // Persist custom preset colors first, then publish globally.
      saveCustomMutation.mutate(
        { id: selectedPreset.id, theme: themeDraft },
        { onSuccess: () => publishMutation.mutate(activeTheme) }
      );
      return;
    }
    publishMutation.mutate(activeTheme);
  };

  const handlePresetCreated = (preset: ExtendedThemePreset) => {
    setSelectedPresetId(preset.id);
    const nextTheme = cloneTheme({
      ...preset.theme,
      preset: preset.id as ThemeConfig["preset"],
    });
    setThemeDraft(nextTheme);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-theme-primary">Apariencia</h1>
          <p className="text-sm text-theme-muted mt-0.5">
            Personaliza la apariencia y guarda los cambios para toda la aplicación
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleReset} className="btn-ghost text-sm flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Restablecer
          </button>
          {selectedPreset && isSelectedPersistedCustom && (
            <button
              onClick={() => setDeleteConfirm(selectedPreset)}
              className="flex items-center gap-2 text-sm text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors border border-red-200"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar Preset
            </button>
          )}
          {selectedPreset && isSelectedPersistedCustom && (
            <button
              onClick={() => {
                setRenamePreset(selectedPreset);
                setShowRenameModal(true);
              }}
              className="flex items-center gap-2 text-sm text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors border border-blue-200"
            >
              <Pencil className="h-4 w-4" />
              Renombrar
            </button>
          )}
          <button
            onClick={handlePublish}
            disabled={publishMutation.isPending}
            className="btn-primary text-sm flex items-center gap-2 disabled:opacity-60"
          >
            {publishMutation.isPending ? (
              <LoadingSpinner size="sm" className="border-white border-t-white/30" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Guardar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Left panel ── */}
        <div className="lg:col-span-2 card p-5 space-y-5">
          {/* Preset selector */}
          <div>
            <label className="block text-sm font-medium text-theme-muted mb-2">Preset</label>
            <div className="flex gap-2">
              <select
                value={selectedPresetId}
                onChange={(e) => setSelectedPresetId(e.target.value)}
                className="input-field text-sm flex-1"
              >
                <optgroup label="Presets Base">
                  {presets
                    .filter((p) => isBasePreset(p.id))
                    .map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </optgroup>
                <optgroup label="Presets Personalizados">
                  {presets
                    .filter((p) => !isBasePreset(p.id))
                    .map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </optgroup>
              </select>
              <button
                onClick={() => applyPreset(selectedPresetId)}
                className="btn-primary text-sm px-4 flex items-center gap-2 whitespace-nowrap"
              >
                <Palette className="h-4 w-4" />
                Aplicar
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-ghost text-sm px-3 flex items-center gap-2 whitespace-nowrap border border-theme-color"
                title="Crear nuevo preset personalizado basado en el tema actual"
              >
                <Plus className="h-4 w-4" />
                Nuevo
              </button>
            </div>
            <p className="text-xs text-theme-muted mt-2">
              {presets.find((p) => p.id === selectedPresetId)?.description || "Preset editable"}
            </p>
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-theme-primary">Sidebar</h2>

            {/* Logo variant */}
            <div className="max-w-2xl">
              <label className="block text-xs font-medium text-theme-muted mb-2">Logo del Sidebar</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {logoOptions.map((option) => (
                  <label
                    key={option.value}
                    className="cursor-pointer rounded-xl border p-3 transition-all"
                    style={{
                      borderColor:
                        activeTheme.overrides.sidebar.logoVariant === option.value
                          ? activeTheme.overrides.sidebar.activeBackground
                          : activeTheme.tokens.borderColor,
                      backgroundColor: activeTheme.tokens.surface,
                    }}
                  >
                    <input
                      type="radio"
                      name="sidebar-logo-variant"
                      value={option.value}
                      checked={activeTheme.overrides.sidebar.logoVariant === option.value}
                      onChange={(e) => setLogoVariant(e.target.value as ThemeLogoVariant)}
                      className="sr-only"
                    />
                    <div className="space-y-2">
                      <div
                        className="rounded-lg border p-2"
                        style={{
                          backgroundColor: option.value === "logo_oscuro" ? "#ffffff" : "#0b1220",
                          borderColor: option.value === "logo_oscuro" ? "#cbd5e1" : "#334155",
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
                        <p className="text-sm font-semibold text-theme-primary">{option.label}</p>
                        <p className="text-xs text-theme-muted">{option.description}</p>
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
                onChange={(v) => setColor(["overrides", "sidebar", "background"], v)}
              />
              <ColorField
                label="Texto"
                value={activeTheme.overrides.sidebar.text}
                onChange={(v) => setColor(["overrides", "sidebar", "text"], v)}
              />
              <ColorField
                label="Item activo"
                value={activeTheme.overrides.sidebar.activeBackground}
                onChange={(v) => setColor(["overrides", "sidebar", "activeBackground"], v)}
              />
              <ColorField
                label="Texto activo"
                value={activeTheme.overrides.sidebar.activeText}
                onChange={(v) => setColor(["overrides", "sidebar", "activeText"], v)}
              />
            </div>
          </div>

          {/* ── TopBar & buttons ── */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-theme-primary">TopBar y botones</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <ColorField
                label="TopBar fondo"
                value={activeTheme.overrides.topbar.background}
                onChange={(v) => setColor(["overrides", "topbar", "background"], v)}
              />
              <ColorField
                label="TopBar texto"
                value={activeTheme.overrides.topbar.text}
                onChange={(v) => setColor(["overrides", "topbar", "text"], v)}
              />
              <ColorField
                label="Botón primario"
                value={activeTheme.overrides.buttons.primaryBackground}
                onChange={(v) => setColor(["overrides", "buttons", "primaryBackground"], v)}
              />
              <ColorField
                label="Texto botón primario"
                value={activeTheme.overrides.buttons.primaryText}
                onChange={(v) => setColor(["overrides", "buttons", "primaryText"], v)}
              />
              <ColorField
                label="Botón secundario"
                value={activeTheme.overrides.buttons.secondaryBackground}
                onChange={(v) => setColor(["overrides", "buttons", "secondaryBackground"], v)}
              />
              <ColorField
                label="Botón peligro"
                value={activeTheme.overrides.buttons.dangerBackground}
                onChange={(v) => setColor(["overrides", "buttons", "dangerBackground"], v)}
              />
            </div>
          </div>

          {/* ── Badges ── */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-theme-primary">Badges</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <ColorField
                label="Badge admin"
                value={activeTheme.overrides.badges.adminBackground}
                onChange={(v) => setColor(["overrides", "badges", "adminBackground"], v)}
              />
              <ColorField
                label="Badge manager"
                value={activeTheme.overrides.badges.managerBackground}
                onChange={(v) => setColor(["overrides", "badges", "managerBackground"], v)}
              />
              <ColorField
                label="Badge viewer"
                value={activeTheme.overrides.badges.viewerBackground}
                onChange={(v) => setColor(["overrides", "badges", "viewerBackground"], v)}
              />
              <ColorField
                label="Badge activo"
                value={activeTheme.overrides.badges.activeBackground}
                onChange={(v) => setColor(["overrides", "badges", "activeBackground"], v)}
              />
              <ColorField
                label="Badge bloqueado"
                value={activeTheme.overrides.badges.lockedBackground}
                onChange={(v) => setColor(["overrides", "badges", "lockedBackground"], v)}
              />
              <ColorField
                label="Badge deshabilitado"
                value={activeTheme.overrides.badges.disabledBackground}
                onChange={(v) => setColor(["overrides", "badges", "disabledBackground"], v)}
              />
            </div>
          </div>

          {/* ── Calendar & toasts ── */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-theme-primary">Calendario y toasts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <ColorField
                label="Hoy (calendario)"
                value={activeTheme.overrides.calendar.todayBackground}
                onChange={(v) => setColor(["overrides", "calendar", "todayBackground"], v)}
              />
              <ColorField
                label="Botón activo calendario"
                value={activeTheme.overrides.calendar.activeButtonBackground}
                onChange={(v) => setColor(["overrides", "calendar", "activeButtonBackground"], v)}
              />
              <ColorField
                label="Indicador hora actual"
                value={activeTheme.overrides.calendar.nowIndicator}
                onChange={(v) => setColor(["overrides", "calendar", "nowIndicator"], v)}
              />
              <ColorField
                label="Toast fondo"
                value={activeTheme.overrides.toasts.background}
                onChange={(v) => setColor(["overrides", "toasts", "background"], v)}
              />
              <ColorField
                label="Toast texto"
                value={activeTheme.overrides.toasts.text}
                onChange={(v) => setColor(["overrides", "toasts", "text"], v)}
              />
              <ColorField
                label="Toast error"
                value={activeTheme.overrides.toasts.errorBackground}
                onChange={(v) => setColor(["overrides", "toasts", "errorBackground"], v)}
              />
            </div>
          </div>
        </div>

        {/* ── Right: preview ── */}
        <div className="card p-5 space-y-4 h-fit">
          <h2 className="text-sm font-semibold text-theme-primary">Vista previa rápida</h2>

          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: activeTheme.overrides.sidebar.background }}
          >
            <p className="text-xs font-semibold" style={{ color: activeTheme.overrides.sidebar.text }}>
              Sidebar
            </p>
            <p className="text-[11px] mt-1" style={{ color: activeTheme.overrides.sidebar.text }}>
              {activeTheme.overrides.sidebar.logoVariant === "logo_claro" ? "Logo Claro" : "Logo Oscuro"}
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
            <p className="text-xs" style={{ color: activeTheme.tokens.textPrimary }}>Texto principal</p>
            <p className="text-xs mt-1" style={{ color: activeTheme.tokens.textMuted }}>Texto secundario</p>
            <button
              className="mt-3 text-xs font-semibold px-3 py-2 rounded-md"
              style={{
                backgroundColor: activeTheme.overrides.buttons.primaryBackground,
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
            <p className="mt-1 opacity-90">Notificación de ejemplo.</p>
          </div>

          <div className="rounded-lg p-3 text-xs border border-dashed border-theme-color bg-theme-surface-muted text-theme-muted flex items-start gap-2">
            <Palette className="h-4 w-4 mt-0.5" />
            <p>La vista previa se aplica en vivo al resto de la aplicación mientras editas.</p>
          </div>
        </div>
      </div>

      {/* ── Site Branding ── */}
      <div className="card p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-gold-500" />
          <h2 className="text-sm font-semibold text-theme-primary">Identidad del Sitio</h2>
        </div>
        <p className="text-xs text-theme-muted -mt-2">
          Título que aparece en la pestaña del navegador y favicon de la aplicación.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Title */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-theme-muted">
              Título de la pestaña
            </label>
            <input
              type="text"
              value={siteTitle}
              onChange={(e) => setSiteTitleDraft(e.target.value)}
              className="input-field"
              placeholder="Gestión de Turnos"
              maxLength={60}
            />
            <p className="text-xs text-theme-muted">{siteTitle.length}/60 caracteres</p>
          </div>

          {/* Favicon upload */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-theme-muted">
              Favicon
            </label>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-150 py-6 px-4 text-center"
              style={{
                borderColor: isDragging ? 'var(--theme-brand-primary)' : 'var(--theme-border-color)',
                backgroundColor: isDragging ? 'var(--theme-surface-muted)' : 'var(--theme-surface)',
              }}
            >
              {uploadFaviconMutation.isPending ? (
                <LoadingSpinner size="md" />
              ) : (
                <>
                  <UploadCloud
                    className="h-8 w-8 transition-colors"
                    style={{ color: isDragging ? 'var(--theme-brand-primary)' : 'var(--theme-text-muted)' }}
                  />
                  <div>
                    <p className="text-sm font-medium text-theme-primary">
                      Arrastra tu favicon aquí
                    </p>
                    <p className="text-xs text-theme-muted mt-0.5">
                      o{' '}
                      <span
                        className="font-semibold underline underline-offset-2"
                        style={{ color: 'var(--theme-brand-primary)' }}
                      >
                        examina tus archivos
                      </span>
                    </p>
                  </div>
                  <p className="text-[11px] text-theme-muted">ICO · PNG · SVG · JPG · WEBP — máx. 2 MB</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".ico,.png,.svg,.jpg,.jpeg,.webp,.gif,image/x-icon,image/png,image/svg+xml,image/jpeg,image/webp"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFaviconFile(file);
                  e.target.value = '';
                }}
              />
            </div>

            {/* Current favicon URL editable */}
            <div className="flex items-center gap-2">
              <FileImage className="h-3.5 w-3.5 text-theme-muted shrink-0" />
              <input
                type="text"
                value={siteFaviconUrl}
                onChange={(e) => setSiteFaviconUrlDraft(e.target.value)}
                className="input-field text-xs"
                placeholder="/uploads/favicon.ico"
              />
            </div>
          </div>
        </div>

        {/* Favicon preview + save */}
        <div className="flex items-center justify-between pt-2 border-t border-theme-color">
          <div className="flex items-center gap-3">
            {siteFaviconUrl ? (
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded border border-theme-color bg-theme-surface-muted flex items-center justify-center overflow-hidden">
                  <img
                    src={siteFaviconUrl}
                    alt="favicon preview"
                    className="h-6 w-6 object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
                <span className="text-xs text-theme-muted">Vista previa</span>
              </div>
            ) : (
              <span className="text-xs text-theme-muted">Sin favicon</span>
            )}
          </div>

          <button
            onClick={() => saveBrandingMutation.mutate({ title: siteTitle, faviconUrl: siteFaviconUrl })}
            disabled={saveBrandingMutation.isPending || !siteTitle.trim()}
            className="btn-primary text-sm flex items-center gap-2 disabled:opacity-60"
          >
            {saveBrandingMutation.isPending ? (
              <LoadingSpinner size="sm" className="border-white border-t-white/30" />
            ) : brandingSaved ? (
              <Check className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {brandingSaved ? 'Guardado' : 'Guardar identidad'}
          </button>
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreatePresetModal
          baseTheme={activeTheme}
          onClose={() => setShowCreateModal(false)}
          onCreated={handlePresetCreated}
        />
      )}

      {showRenameModal && renamePreset && (
        <RenamePresetModal
          preset={renamePreset}
          onClose={() => setShowRenameModal(false)}
          onRenamed={(updatedPreset) => {
            setRenamePreset(updatedPreset);
            setSelectedPresetId(updatedPreset.id);
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteConfirm}
        title="Eliminar Preset"
        description={`¿Eliminar el preset "${deleteConfirm?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}