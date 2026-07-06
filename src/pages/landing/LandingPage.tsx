import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, MapPin, BarChart3, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-primary-100 selection:text-primary-900">
      {/* Background Decorators */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#6EA2B3]/10 rounded-full blur-3xl"></div>
        <div className="absolute top-40 -left-40 w-96 h-96 bg-[#0A4174]/5 rounded-full blur-3xl"></div>
      </div>

      {/* Header / Navbar */}
      <header className={`w-full fixed top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#0A4174]/90 backdrop-blur-md shadow-lg py-1' : 'bg-transparent py-4'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
              <img src="/logo_blue.png" alt="GeoAsistencia" className="h-12 w-auto object-contain" />
              <span className="text-white font-bold text-2xl tracking-[0.1em]">GEOASISTO</span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/login')}
                className="bg-white hover:bg-slate-100 text-[#0A4174] px-5 py-2.5 text-sm font-semibold rounded-none btn-angled shadow-md transition-all active:scale-95 flex items-center gap-2"
              >
                Acceder al Sistema
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-40 lg:pt-48 lg:pb-56 overflow-hidden bg-[#0A4174]">
        {/* Background Image Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
          style={{ backgroundImage: 'url("/hero.png")', opacity: 0.3 }}
        ></div>

        {/* Gradients to blend image into the solid color */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A4174]/80 via-transparent to-[#0A4174] z-0"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white text-sm font-semibold mb-8 animate-fade-in-up backdrop-blur-sm shadow-sm">
            <ShieldCheck className="w-4 h-4" />
            Control de Asistencia Georreferenciada
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-7xl font-extrabold text-white tracking-tight mb-6 max-w-4xl mx-auto animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            Gestión inteligente de personal con <span className="text-[#6EA2B3] relative whitespace-nowrap">
              precisión GPS
              <svg className="absolute -bottom-2 left-0 w-full h-3 text-[#6EA2B3]/40" viewBox="0 0 100 10" preserveAspectRatio="none">
                <path d="M0 5 Q 50 10 100 5" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </span>
          </h1>

          <p className="text-lg md:text-xl text-blue-100 font-medium mb-12 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            Automatiza el registro de asistencia, verifica la ubicación exacta de tus empleados en tiempo real y gestiona permisos de forma centralizada.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up" style={{ animationDelay: '300ms' }}>
            <button
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto bg-white text-[#0A4174] px-10 py-4 text-lg font-bold shadow-xl hover:shadow-2xl hover:bg-slate-100 hover:-translate-y-1 rounded-none btn-angled transition-all flex items-center justify-center gap-2"
            >
              Comenzar Ahora
            </button>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-24 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">¿Por qué elegir GeoAsisto?</h2>
            <p className="text-slate-500 text-lg">La plataforma más completa y fácil de usar para modernizar tu departamento de Recursos Humanos.</p>
          </div>

          <div className="flex flex-col lg:flex-row items-center gap-16 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
            <div className="flex-1 relative order-2 lg:order-1">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#0A4174]/20 to-[#6EA2B3]/20 rounded-3xl transform -rotate-3 scale-105"></div>
              <img
                src="/features.png"
                alt="Control de asistencia GPS"
                className="relative rounded-3xl shadow-2xl border border-white/80 object-cover w-full h-[400px]"
              />
            </div>

            <div className="flex-1 text-left order-1 lg:order-2 bg-white p-10 rounded-3xl shadow-xl border border-slate-100">
              <ul className="space-y-8">
                <li className="flex items-start gap-5">
                  <div className="mt-1 bg-blue-50 p-3 rounded-xl border border-blue-100"><ShieldCheck className="w-6 h-6 text-[#0A4174]" /></div>
                  <div>
                    <h4 className="font-bold text-xl text-slate-900 mb-1">Sin instalación de hardware</h4>
                    <p className="text-slate-500 leading-relaxed">No requieres comprar relojes biométricos costosos. Todo funciona en la nube.</p>
                  </div>
                </li>
                <li className="flex items-start gap-5">
                  <div className="mt-1 bg-blue-50 p-3 rounded-xl border border-blue-100"><MapPin className="w-6 h-6 text-[#0A4174]" /></div>
                  <div>
                    <h4 className="font-bold text-xl text-slate-900 mb-1">App Móvil y Web</h4>
                    <p className="text-slate-500 leading-relaxed">Tus empleados fichan desde sus propios teléfonos inteligentes con validación de ubicación.</p>
                  </div>
                </li>
                <li className="flex items-start gap-5">
                  <div className="mt-1 bg-blue-50 p-3 rounded-xl border border-blue-100"><BarChart3 className="w-6 h-6 text-[#0A4174]" /></div>
                  <div>
                    <h4 className="font-bold text-xl text-slate-900 mb-1">Reportes Automáticos</h4>
                    <p className="text-slate-500 leading-relaxed">Exporta la nómina a Excel o PDF con un solo clic. Cero errores matemáticos.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How it works Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">¿Cómo funciona?</h2>
            <p className="text-slate-500 text-lg">En tres simples pasos tendrás el control total de la asistencia de tu equipo.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-12 text-center">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-2xl font-bold mb-4 shadow-sm border border-blue-100">1</div>
              <h4 className="text-xl font-bold text-slate-900 mb-2">Registra tus Sedes</h4>
              <p className="text-slate-500">Agrega las oficinas de tu empresa y define el perímetro exacto en el mapa donde los empleados deben estar para fichar.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-2xl font-bold mb-4 shadow-sm border border-blue-100">2</div>
              <h4 className="text-xl font-bold text-slate-900 mb-2">Invita a tu Equipo</h4>
              <p className="text-slate-500">Tus empleados se registran en la plataforma, y tú los asignas a un turno y a una sede específica.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-2xl font-bold mb-4 shadow-sm border border-blue-100">3</div>
              <h4 className="text-xl font-bold text-slate-900 mb-2">Monitorea en Vivo</h4>
              <p className="text-slate-500">Observa en tiempo real quién ha llegado, quién está ausente y gestiona las solicitudes de permisos al instante.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-slate-50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Todo lo que necesitas para tu nómina</h2>
            <p className="text-slate-500 text-lg">Una plataforma completa diseñada para optimizar los recursos humanos y eliminar el fraude en los registros de asistencia.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 border border-slate-100 hover:border-[#6EA2B3]/50 hover:shadow-lg transition-all duration-300 group rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#0A4174]/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
              <div className="w-14 h-14 bg-blue-50 text-[#0A4174] flex items-center justify-center rounded-xl mb-6 shadow-sm border border-blue-100 group-hover:bg-[#0A4174] group-hover:text-white transition-colors">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Geocercas de Seguridad</h3>
              <p className="text-slate-500 leading-relaxed">
                Define el perímetro exacto de tus oficinas. Los empleados solo podrán registrar su entrada o salida si se encuentran físicamente dentro del área permitida.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 border border-slate-100 hover:border-[#6EA2B3]/50 hover:shadow-lg transition-all duration-300 group rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 flex items-center justify-center rounded-xl mb-6 shadow-sm border border-emerald-100 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Permisos y Justificaciones</h3>
              <p className="text-slate-500 leading-relaxed">
                Flujo digital para que los empleados soliciten permisos médicos o justificaciones. Apruébalos con un clic y el sistema los reflejará automáticamente en la asistencia.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 border border-slate-100 hover:border-[#6EA2B3]/50 hover:shadow-lg transition-all duration-300 group rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
              <div className="w-14 h-14 bg-purple-50 text-purple-600 flex items-center justify-center rounded-xl mb-6 shadow-sm border border-purple-100 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Reportes Avanzados</h3>
              <p className="text-slate-500 leading-relaxed">
                Obtén resúmenes diarios, reportes semanales por empleado y exportaciones instantáneas a Excel y PDF con cálculo automático de horas y tardanzas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#001D39] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <img src="/logo_blue.png" alt="GeoAsistencia" className="h-10 w-auto object-contain" />
            <span className="text-white font-bold text-xl tracking-[0.1em]">GEOASISTO</span>
          </div>
          <p className="text-sm text-slate-400 font-medium">
            &copy; {new Date().getFullYear()} GeoAsisto. Todos los derechos reservados.
          </p>
        </div>
      </footer>

      {/* Custom Styles for Animations & Buttons */}
      <style>{`
        .btn-angled {
          clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
};
