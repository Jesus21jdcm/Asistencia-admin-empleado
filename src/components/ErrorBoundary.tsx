import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="bg-white rounded-2xl shadow-xl shadow-red-500/10 border border-red-100 p-8 max-w-2xl w-full">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Algo salió mal</h1>
                <p className="text-slate-500 text-sm">La aplicación encontró un error inesperado al intentar cargar esta pantalla.</p>
              </div>
            </div>
            
            {this.state.error && (
              <div className="mb-6">
                <p className="text-sm font-semibold text-slate-700 mb-2">Mensaje de error:</p>
                <div className="bg-red-50 text-red-800 p-4 rounded-xl font-mono text-sm border border-red-100 overflow-auto">
                  {this.state.error.toString()}
                </div>
              </div>
            )}
            
            {this.state.errorInfo && (
              <div className="mb-6">
                <p className="text-sm font-semibold text-slate-700 mb-2">Stack trace (Componentes):</p>
                <div className="bg-slate-900 text-slate-300 p-4 rounded-xl font-mono text-xs overflow-auto max-h-64 whitespace-pre-wrap">
                  {this.state.errorInfo.componentStack}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-100">
              <button 
                onClick={() => window.location.href = '/'}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors"
              >
                Volver al Inicio
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Recargar página
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
