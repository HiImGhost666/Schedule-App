import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Users, Clock3, CheckCircle2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import logoIA from '@/assets/Logotipo_IA.png';
import { useAuthStore } from '@/store/authStore';
import api from '@/config/api';
import toast from 'react-hot-toast';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const clearAuthError = () => {
    if (authError) {
      setAuthError(null);
    }
  };

  const onSubmit = async (data: LoginForm) => {
    try {
      setAuthError(null);
      const res = await api.post('/auth/login', data);
      const { user, accessToken, refreshToken } = res.data.data;
      setAuth(user, accessToken, refreshToken);
      toast.success(`Bienvenido, ${user.name}`);
      // Redirect to password change if required
      if (user.forcePasswordChange) {
        navigate('/profile?change=1');
      } else {
        navigate('/');
      }
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        || 'Error al iniciar sesión';
      setAuthError(message);
      toast.error(message);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-navy-900">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700" />
        <div className="absolute -left-16 top-10 h-72 w-72 rounded-full bg-gold-400/10 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-navy-300/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(217,230,242,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(217,230,242,0.04)_1px,transparent_1px)] bg-[size:38px_38px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center p-4 sm:p-6 lg:p-10">
        <div className="grid w-full overflow-hidden rounded-3xl border border-white/20 bg-white/[0.03] shadow-[0_24px_72px_rgba(6,14,24,0.55)] backdrop-blur-sm lg:grid-cols-[1.15fr_0.85fr]">
          <section className="relative border-b border-white/10 p-7 text-white sm:p-9 lg:border-b-0 lg:border-r">
            <div className="absolute right-0 top-0 h-28 w-28 rounded-bl-[36px] border-b border-l border-white/10 bg-white/5" />

            <div className="flex items-center gap-3">
              <img
                src={logoIA}
                alt="Logotipo IA"
                className="h-12 w-12 object-contain"
              />
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-navy-200">Portal Corporativo</p>
                <h1 className="text-lg font-semibold">Sistema de Guardias</h1>
              </div>
            </div>

            <div className="mt-10 max-w-lg">
              <p className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
                Coordinación operativa con estándar empresarial.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-navy-100/95">
                Gestiona turnos, auditoría y notificaciones en una plataforma unificada para equipos críticos.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3">
                <div className="flex items-start gap-3">
                  <Users className="mt-0.5 h-4 w-4 text-gold-300" />
                  <div>
                    <p className="text-sm font-semibold">Colaboración de Equipos</p>
                    <p className="mt-1 text-xs text-navy-100/90">Roles y permisos claros para operaciones seguras.</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3">
                <div className="flex items-start gap-3">
                  <Clock3 className="mt-0.5 h-4 w-4 text-gold-300" />
                  <div>
                    <p className="text-sm font-semibold">Cobertura 24/7</p>
                    <p className="mt-1 text-xs text-navy-100/90">Asignaciones semanales con respuesta rápida a cambios.</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-gold-300" />
                  <div>
                    <p className="text-sm font-semibold">Trazabilidad Completa</p>
                    <p className="mt-1 text-xs text-navy-100/90">Registro de actividad y reportes para control interno.</p>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-10 text-xs text-navy-200/90">© {new Date().getFullYear()} Sistema Corporativo de Guardias</p>
          </section>

          <section className="bg-white p-7 sm:p-9">
            <div className="mx-auto max-w-md">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-navy-400">Acceso Seguro</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-navy-800">Iniciar Sesión</h2>
              <p className="mt-2 text-sm text-navy-400">Ingresa tus credenciales corporativas para continuar.</p>

              {authError && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="mt-5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3"
                >
                  <p className="text-sm font-medium text-red-700">{authError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-4">
                <div>
                  <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-navy-600">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
                    <input
                      {...register('email', { onChange: clearAuthError })}
                      id="login-email"
                      type="email"
                      placeholder="usuario@empresa.com"
                      className="input-field !pl-14"
                      autoComplete="email"
                      autoFocus
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={errors.email ? 'login-email-error' : undefined}
                    />
                  </div>
                  {errors.email && (
                    <p id="login-email-error" className="mt-1.5 text-xs font-medium text-red-700">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-navy-600">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
                    <input
                      {...register('password', { onChange: clearAuthError })}
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="input-field !pl-14 !pr-11"
                      autoComplete="current-password"
                      aria-invalid={Boolean(errors.password)}
                      aria-describedby={errors.password ? 'login-password-error' : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-navy-300 transition-colors hover:text-navy-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-300"
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p id="login-password-error" className="mt-1.5 text-xs font-medium text-red-700">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary mt-2 flex w-full items-center justify-center gap-2 py-3 text-sm transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-300 focus-visible:ring-offset-2"
                >
                  {isSubmitting ? (
                    <>
                      <LoadingSpinner size="sm" className="border-white border-t-white/40" />
                      Iniciando sesión...
                    </>
                  ) : (
                    'Ingresar al sistema'
                  )}
                </button>
              </form>

              <div className="mt-6 rounded-xl border border-navy-100 bg-navy-50 px-4 py-3">
                <p className="text-xs leading-relaxed text-navy-500">
                  Acceso restringido a personal autorizado. Si no puedes ingresar, contacta al administrador.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
