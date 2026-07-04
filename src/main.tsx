import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'leaflet/dist/leaflet.css'
import App from './App.tsx'

if (!import.meta.env.VITE_FIREBASE_API_KEY) {
  document.getElementById('root')!.innerHTML = `
    <div style="min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: #f8fafc; font-family: system-ui, sans-serif; padding: 2rem; text-align: center;">
      <div style="background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); border: 1px solid #ef4444; max-width: 500px;">
        <h1 style="color: #ef4444; margin-top: 0; font-size: 1.5rem; font-weight: bold;">⚠️ Reinicio Requerido</h1>
        <p style="color: #334155; margin-bottom: 1.5rem; line-height: 1.5;">He guardado tus claves de Firebase, pero Vite no las ha cargado porque el servidor ya estaba corriendo.</p>
        <div style="background: #1e293b; color: #10b981; padding: 1rem; border-radius: 0.5rem; text-align: left; font-family: monospace;">
          1. Ve a tu terminal<br/>
          2. Presiona <strong>Ctrl + C</strong><br/>
          3. Escribe <strong>npm run dev</strong>
        </div>
      </div>
    </div>
  `;
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
