import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/config/api';
import { getApiErrorMessage } from '@/lib/apiError';
import { useAuthStore } from '@/store/authStore';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { pageMeta } from '@/config/pageMeta';

type Skill = {
  id: string;
  name: string;
  category?: string | null;
  color: string;
  description?: string | null;
  isActive: boolean;
};

const emptyForm = { name: '', category: '', color: '#1d4ed8', description: '' };

export function SkillsPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const roleName = user?.role?.name ?? '';
  const canManage = roleName === 'admin';
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<Skill | null>(null);
  const [search, setSearch] = useState('');
  const meta = pageMeta['/admin/skills'];

  const { data, isLoading } = useQuery<{ data: Skill[] }>({
    queryKey: ['skills', 'admin', search],
    queryFn: () =>
      api
        .get('/skills', { params: { includeInactive: true, search: search || undefined } })
        .then((response) => response.data),
  });

  const skills = data?.data ?? [];
  const grouped = useMemo(() => {
    const map = new Map<string, Skill[]>();
    skills.forEach((skill) => {
      const key = skill.category || 'Sin categoría';
      map.set(key, [...(map.get(key) ?? []), skill]);
    });
    return [...map.entries()];
  }, [skills]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        category: form.category || undefined,
        description: form.description || undefined,
      };
      if (editing) {
        return api.patch(`/skills/${editing.id}`, payload);
      }
      return api.post('/skills', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      toast.success(editing ? 'Skill actualizada' : 'Skill creada');
      setForm(emptyForm);
      setEditing(null);
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'No se pudo guardar la skill')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/skills/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      toast.success('Skill desactivada');
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'No se pudo desactivar la skill')),
  });

  const startEdit = (skill: Skill) => {
    if (!canManage) return;
    setEditing(skill);
    setForm({
      name: skill.name,
      category: skill.category ?? '',
      color: skill.color,
      description: skill.description ?? '',
    });
  };

  return (
    <div className="space-y-5 animate-fade-in p-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-theme-primary">{meta.title}</h1>
        {meta.subtitle ? <p className="text-sm text-theme-muted mt-1">{meta.subtitle}</p> : null}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-5">
        <section className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            {editing ? <Edit2 className="h-4 w-4 text-theme-muted" /> : <Plus className="h-4 w-4 text-theme-muted" />}
            <h2 className="text-lg font-bold text-theme-primary">{editing ? 'Editar skill' : 'Nueva skill'}</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-theme-muted mb-1">Nombre</label>
              <input
                className="input-field"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Guardia crítica"
                disabled={!canManage}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-muted mb-1">Categoría</label>
              <input
                className="input-field"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Área, nivel o certificación"
                disabled={!canManage}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-muted mb-1">Color</label>
              <input
                className="input-field h-10"
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                disabled={!canManage}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-muted mb-1">Descripción</label>
              <textarea
                className="input-field min-h-20 resize-none"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                disabled={!canManage}
              />
            </div>
          </div>

          {canManage ? (
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-primary text-sm flex-1"
                disabled={saveMutation.isPending || !form.name.trim()}
                onClick={() => saveMutation.mutate()}
              >
                {editing ? 'Guardar' : 'Crear'}
              </button>
              {editing ? (
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  onClick={() => {
                    setEditing(null);
                    setForm(emptyForm);
                  }}
                >
                  Cancelar
                </button>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-theme-muted">Solo administradores pueden crear o editar skills.</p>
          )}
        </section>

        <section className="card p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-theme-primary">Catálogo</h2>
            <input
              className="input-field max-w-xs text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar skill..."
            />
          </div>

          {isLoading ? (
            <div className="py-10 flex justify-center">
              <LoadingSpinner size="lg" />
            </div>
          ) : grouped.length === 0 ? (
            <EmptyState icon={Plus} title="Sin skills" description="Crea una skill para empezar a clasificar capacidades" />
          ) : (
            <div className="space-y-5">
              {grouped.map(([category, items]) => (
                <div key={category} className="space-y-2">
                  <p className="text-xs font-semibold text-theme-muted uppercase tracking-wider">{category}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-2">
                    {items.map((skill) => (
                      <div
                        key={skill.id}
                        className="rounded-lg border border-theme-color bg-theme-surface p-3 flex items-start justify-between gap-3"
                      >
                        <button type="button" className="min-w-0 text-left" onClick={() => startEdit(skill)}>
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: skill.color }} />
                            <span className="font-semibold text-theme-primary truncate">{skill.name}</span>
                          </div>
                          {skill.description ? (
                            <p className="text-xs text-theme-muted mt-1 line-clamp-2">{skill.description}</p>
                          ) : null}
                          {!skill.isActive ? <span className="text-xs text-amber-600">Inactiva</span> : null}
                        </button>
                        {canManage && skill.isActive ? (
                          <button
                            type="button"
                            className="p-1.5 text-theme-muted hover:text-red-600"
                            onClick={() => deleteMutation.mutate(skill.id)}
                            title="Desactivar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default SkillsPage;
