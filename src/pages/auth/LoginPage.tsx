import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { authService } from '../../services/authService';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2, ShieldCheck, User } from 'lucide-react';
import { toast } from 'sonner';

const loginSchema = z.object({
  email: z.string().email({ message: 'Ingresa un correo válido' }),
  password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres' }),
});

const registerSchema = z.object({
  displayName: z.string().min(2, { message: 'El nombre es obligatorio' }),
  email: z.string().email({ message: 'Ingresa un correo válido' }),
  password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

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
      toast.error(error.message || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  const onRegisterSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    try {
      await authService.register(data.email, data.password, data.displayName, 'employee');
      toast.success('Cuenta creada exitosamente. Espera la validación del administrador.');
      setIsLogin(true);
      resetSignup();
    } catch (error: any) {
      toast.error(error.message || 'Error al crear la cuenta');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white py-10 px-6 shadow-2xl shadow-primary-900/5 sm:rounded-3xl sm:px-12 border border-slate-100/60 backdrop-blur-xl relative overflow-hidden w-full max-w-md">
      {/* Decoraciones de fondo */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary-500/10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl"></div>

      <div className="relative">
        <div className="mb-8 text-center flex flex-col items-center">
          <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center mb-4 border border-primary-100 shadow-inner">
            <ShieldCheck className="w-6 h-6 text-primary-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isLogin ? 'Acceso al Sistema' : 'Registro de Empleado'}
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            {isLogin ? 'Ingresa tus credenciales para continuar' : 'Crea tu cuenta para registrar asistencia'}
          </p>
        </div>

        {isLogin ? (
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
                  placeholder="ejemplo@empresa.com"
                  className={`block w-full pl-10 pr-3 py-2.5 border ${
                    errorsLogin.email ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-200 focus:ring-primary-500 focus:border-primary-500'
                  } rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors bg-slate-50/50 hover:bg-white`}
                  {...registerLogin('email')}
                />
              </div>
              {errorsLogin.email && <p className="mt-1 text-sm text-red-500">{errorsLogin.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="password-login">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password-login"
                  type="password"
                  placeholder="••••••••"
                  className={`block w-full pl-10 pr-3 py-2.5 border ${
                    errorsLogin.password ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-200 focus:ring-primary-500 focus:border-primary-500'
                  } rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors bg-slate-50/50 hover:bg-white`}
                  {...registerLogin('password')}
                />
              </div>
              {errorsLogin.password && <p className="mt-1 text-sm text-red-500">{errorsLogin.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm shadow-primary-500/30 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Verificando...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmitSignup(onRegisterSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="name-signup">
                Nombre Completo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="name-signup"
                  type="text"
                  placeholder="Juan Pérez"
                  className={`block w-full pl-10 pr-3 py-2.5 border ${
                    errorsSignup.displayName ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-200 focus:ring-primary-500 focus:border-primary-500'
                  } rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors bg-slate-50/50 hover:bg-white`}
                  {...registerSignup('displayName')}
                />
              </div>
              {errorsSignup.displayName && <p className="mt-1 text-sm text-red-500">{errorsSignup.displayName.message}</p>}
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
                  placeholder="ejemplo@empresa.com"
                  className={`block w-full pl-10 pr-3 py-2.5 border ${
                    errorsSignup.email ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-200 focus:ring-primary-500 focus:border-primary-500'
                  } rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors bg-slate-50/50 hover:bg-white`}
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
                  className={`block w-full pl-10 pr-3 py-2.5 border ${
                    errorsSignup.password ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-200 focus:ring-primary-500 focus:border-primary-500'
                  } rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors bg-slate-50/50 hover:bg-white`}
                  {...registerSignup('password')}
                />
              </div>
              {errorsSignup.password && <p className="mt-1 text-sm text-red-500">{errorsSignup.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm shadow-primary-500/30 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Registrando...
                </>
              ) : (
                'Registrarse'
              )}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm font-medium text-primary-600 hover:text-primary-500 transition-colors"
          >
            {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia Sesión'}
          </button>
        </div>
      </div>
    </div>
  );
};
