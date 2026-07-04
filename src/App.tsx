import { AppRouter } from './routes/AppRouter';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from './components/ErrorBoundary';

const queryClient = new QueryClient();

function App() {
  if (!import.meta.env.VITE_FIREBASE_API_KEY) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', fontFamily: 'system-ui, sans-serif', padding: '2rem', textAlign: 'center' }}>
        <div style={{ background: 'white', padding: '2rem', borderRadius: '1rem', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', border: '1px solid #ef4444', maxWidth: '500px' }}>
          <h1 style={{ color: '#ef4444', marginTop: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>⚠️ Reinicio Requerido</h1>
          <p style={{ color: '#334155', marginBottom: '1.5rem', lineHeight: '1.5' }}>He guardado tus claves de Firebase, pero Vite no las ha cargado porque el servidor ya estaba corriendo.</p>
          <div style={{ background: '#1e293b', color: '#10b981', padding: '1rem', borderRadius: '0.5rem', textAlign: 'left', fontFamily: 'monospace' }}>
            1. Ve a tu terminal<br/>
            2. Presiona <strong>Ctrl + C</strong><br/>
            3. Escribe <strong>npm run dev</strong>
          </div>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Toaster position="top-right" richColors closeButton />
        <AppRouter />
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
