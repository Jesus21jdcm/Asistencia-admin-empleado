import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { authService } from '../../services/authService';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2, ShieldCheck, User, CreditCard, Compass, MapPin } from 'lucide-react';
import { toast } from 'sonner';

const loginSchema = z.object({
  email: z.string().email({ message: 'Ingresa un correo válido' }),
  password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres' }),
});

const registerSchema = z.object({
  firstName: z.string().min(2, { message: 'El nombre es obligatorio' }),
  lastName: z.string().min(2, { message: 'El apellido es obligatorio' }),
  documentId: z.string()
    .min(5, { message: 'La cédula es obligatoria' })
    .regex(/^[0-9]+$/, { message: 'La cédula solo debe contener números' }),
  email: z.string().email({ message: 'Ingresa un correo válido' }),
  password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const {
    register: registerLogin,
    handleSubmit: handleSubmitLogin,
    formState: { errors: errorsLogin },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const {
    register: registerSignup,
    handleSubmit: handleSubmitSignup,
    formState: { errors: errorsSignup },
    reset: resetSignup,
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onLoginSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      await authService.login(data.email, data.password);
      toast.success('Sesión iniciada correctamente');
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        toast.error('Las credenciales no son correctas o no están registradas.');
      } else {
        toast.error('Ocurrió un error al intentar iniciar sesión.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!resetEmail) {
      toast.error('Por favor ingresa tu correo electrónico primero para restablecer la contraseña.');
      return;
    }
    setIsLoading(true);
    try {
      await authService.resetPassword(resetEmail);
      toast.success('Te hemos enviado un correo con las instrucciones para restablecer tu contraseña.');
      setIsForgotPassword(false);
      setResetEmail('');
    } catch (error: unknown) {
      toast.error('Ocurrió un error al intentar enviar el correo. Verifica que la dirección sea correcta.');
    } finally {
      setIsLoading(false);
    }
  };

  const onRegisterSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    try {
      await authService.register(data.email, data.password, data.firstName, data.lastName, data.documentId, 'employee');
      toast.success('Cuenta creada exitosamente. Espera la validación del administrador.');
      setIsLogin(true);
      resetSignup();
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        toast.error('Este correo ya está registrado.');
      } else {
        toast.error(error.message || 'Error al crear la cuenta');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white py-10 px-6 shadow-2xl shadow-primary-900/5 sm:rounded-none sm:px-12 border border-[#6EA2B3]/30 relative overflow-hidden w-full max-w-md border-t-4 border-t-primary-800">
      {/* Decoraciones de fondo */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary-500/10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl"></div>

      <div className="relative">
        <div className="mb-8 text-center flex flex-col items-center">
          <div className="flex items-center justify-center mb-6 w-full">
            <img src="/logo_blue.png" alt="GeoAsistencia" className="h-24 sm:h-32 w-auto object-contain" />
          </div>
          <h2 className="text-2xl font-semibold tracking-wide text-slate-900 tracking-tight">
            {isForgotPassword ? 'Recuperar Contraseña' : isLogin ? 'Acceso al Sistema' : 'Registro de Empleado'}
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            {isForgotPassword ? 'Ingresa tu correo para recibir un enlace de recuperación' : isLogin ? 'Ingresa tus credenciales para continuar' : 'Crea tu cuenta para registrar asistencia'}
          </p>
        </div>

        {isForgotPassword ? (
          <form onSubmit={handleForgotPassword} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="email-reset">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email-reset"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="correo@correo.com"
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-none text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-colors bg-slate-50/50 hover:bg-white"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center py-2.5 px-4 text-sm font-semibold disabled:opacity-70 disabled:cursor-not-allowed mt-2 bg-[#0A4174] text-white rounded-none btn-angled shadow-sm hover:brightness-110 active:scale-95 transition-all duration-200"
            >
              <span className={`flex items-center ${isLoading ? '' : 'hidden'}`}>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Enviando...
              </span>
              <span className={isLoading ? 'hidden' : ''}>
                Enviar Enlace
              </span>
            </button>
          </form>
        ) : isLogin ? (
          <form onSubmit={handleSubmitLogin(onLoginSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="email-login">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email-login"
                  type="email"
                  autoComplete="off"
                  placeholder="correo@correo.com"
                  className={`block w-full pl-10 pr-3 py-2.5 border ${errorsLogin.email ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-200 focus:ring-primary-500 focus:border-primary-500'
                    } rounded-none text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-colors bg-slate-50/50 hover:bg-white`}
                  {...registerLogin('email')}
                />
              </div>
              {errorsLogin.email && <p className="mt-1 text-sm text-red-500">{errorsLogin.email.message}</p>}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-slate-700" htmlFor="password-login">
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password-login"
                  type="password"
                  placeholder="••••••••"
                  className={`block w-full pl-10 pr-3 py-2.5 border ${errorsLogin.password ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-200 focus:ring-primary-500 focus:border-primary-500'
                    } rounded-none text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-colors bg-slate-50/50 hover:bg-white`}
                  {...registerLogin('password')}
                />
              </div>
              {errorsLogin.password && <p className="mt-1 text-sm text-red-500">{errorsLogin.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center py-2.5 px-4 text-sm font-semibold disabled:opacity-70 disabled:cursor-not-allowed mt-2 bg-[#0A4174] text-white rounded-none btn-angled shadow-sm hover:brightness-110 active:scale-95 transition-all duration-200"
            >
              <span className={`flex items-center ${isLoading ? '' : 'hidden'}`}>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Verificando...
              </span>
              <span className={isLoading ? 'hidden' : ''}>
                Iniciar Sesión
              </span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmitSignup(onRegisterSubmit)} className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="firstName-signup">
                  Nombres
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="firstName-signup"
                    type="text"
                    placeholder="Juan Carlos"
                    className={`block w-full pl-10 pr-3 py-2.5 border ${errorsSignup.firstName ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-200 focus:ring-primary-500 focus:border-primary-500'
                      } rounded-none text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-colors bg-slate-50/50 hover:bg-white`}
                    {...registerSignup('firstName')}
                  />
                </div>
                {errorsSignup.firstName && <p className="mt-1 text-sm text-red-500">{errorsSignup.firstName.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="lastName-signup">
                  Apellidos
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="lastName-signup"
                    type="text"
                    placeholder="Pérez Gómez"
                    className={`block w-full pl-10 pr-3 py-2.5 border ${errorsSignup.lastName ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-200 focus:ring-primary-500 focus:border-primary-500'
                      } rounded-none text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-colors bg-slate-50/50 hover:bg-white`}
                    {...registerSignup('lastName')}
                  />
                </div>
                {errorsSignup.lastName && <p className="mt-1 text-sm text-red-500">{errorsSignup.lastName.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="documentId-signup">
                Cédula / Documento de Identidad
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <CreditCard className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="documentId-signup"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  onKeyPress={(e) => {
                    if (!/[0-9]/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  placeholder="12345678"
                  className={`block w-full pl-10 pr-3 py-2.5 border ${errorsSignup.documentId ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-200 focus:ring-primary-500 focus:border-primary-500'
                    } rounded-none text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-colors bg-slate-50/50 hover:bg-white`}
                  {...registerSignup('documentId')}
                />
              </div>
              {errorsSignup.documentId && <p className="mt-1 text-sm text-red-500">{errorsSignup.documentId.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="email-signup">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email-signup"
                  type="email"
                  autoComplete="off"
                  placeholder="correo@correo.com"
                  className={`block w-full pl-10 pr-3 py-2.5 border ${errorsSignup.email ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-200 focus:ring-primary-500 focus:border-primary-500'
                    } rounded-none text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-colors bg-slate-50/50 hover:bg-white`}
                  {...registerSignup('email')}
                />
              </div>
              {errorsSignup.email && <p className="mt-1 text-sm text-red-500">{errorsSignup.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="password-signup">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password-signup"
                  type="password"
                  placeholder="••••••••"
                  className={`block w-full pl-10 pr-3 py-2.5 border ${errorsSignup.password ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-200 focus:ring-primary-500 focus:border-primary-500'
                    } rounded-none text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-colors bg-slate-50/50 hover:bg-white`}
                  {...registerSignup('password')}
                />
              </div>
              {errorsSignup.password && <p className="mt-1 text-sm text-red-500">{errorsSignup.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center py-2.5 px-4 text-sm font-semibold disabled:opacity-70 disabled:cursor-not-allowed mt-2 bg-[#0A4174] text-white rounded-none btn-angled shadow-sm hover:brightness-110 active:scale-95 transition-all duration-200"
            >
              <span className={`flex items-center ${isLoading ? '' : 'hidden'}`}>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Registrando...
              </span>
              <span className={isLoading ? 'hidden' : ''}>
                Registrarse
              </span>
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          {isForgotPassword ? (
            <button
              type="button"
              onClick={() => setIsForgotPassword(false)}
              className="text-sm font-medium text-primary-600 hover:text-primary-500 transition-colors"
            >
              Volver al inicio de sesión
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm font-medium text-primary-600 hover:text-primary-500 transition-colors"
            >
              {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia Sesión'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
