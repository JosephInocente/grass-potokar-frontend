import React, { useState } from 'react';
import { X, Wallet, AlertCircle, Loader2, CheckCircle2, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import api from '../api/axiosConfig';

export default function CerrarCajaModal({ isOpen, onClose, idTurno, montoCalculado, onSuccess }) {
  const [montoReal, setMontoReal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCerrar = async () => {
    const monto = parseFloat(montoReal);
    
    if (isNaN(monto) || monto < 0) {
      setError("Por favor, ingresa un monto válido.");
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await api.put(`/turnos/cerrar/${idTurno}`, { montoReal: monto });
      onSuccess();
    } catch (error) {
      // Intenta capturar el error exacto que envía el backend (Spring Boot)
      setError(error.response?.data?.message || "Ocurrió un error al intentar cerrar la caja.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Cálculo en tiempo real para el cajero
  const diferencia = montoReal !== '' && !isNaN(parseFloat(montoReal)) 
    ? parseFloat(montoReal) - montoCalculado 
    : null;
    
  const esCuadrePerfecto = diferencia === 0;
  const esFaltante = diferencia < 0;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 transition-all">
      <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-[0_20px_50px_rgba(8,_112,_184,_0.07)] relative">
        
        {/* Botón Cerrar */}
        <button 
          onClick={!loading ? onClose : undefined} 
          disabled={loading}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-2 rounded-full transition-all disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>
        
        <h2 className="text-2xl font-black text-slate-800 mb-6 text-center tracking-tight">Cierre de Caja</h2>
        
        {/* Tarjeta de Dinero Esperado */}
        <div className="bg-[#F4F6F8] p-5 rounded-[1.5rem] mb-6 text-center border border-slate-100/50">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Efectivo de Hoy (Sistema)</p>
            <p className="text-4xl font-black text-[#00C193]">S/ {montoCalculado.toFixed(2)}</p>
        </div>

        {/* Input de Dinero Real */}
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2 px-2">Efectivo Físico en Caja</label>
        <div className="relative mb-4">
            <Wallet className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6" />
            <input 
                type="number" 
                className="w-full pl-14 pr-5 py-4 bg-[#F4F6F8] border-2 border-transparent rounded-[1.5rem] outline-none focus:bg-white focus:border-[#00C193] focus:ring-4 focus:ring-[#00C193]/10 font-black text-slate-800 text-xl transition-all"
                placeholder="0.00"
                value={montoReal}
                onChange={(e) => setMontoReal(e.target.value)}
                disabled={loading}
            />
        </div>

        {/* Indicador visual de diferencia */}
        {diferencia !== null && (
          <div className={`flex items-center justify-center gap-2 text-sm font-bold p-3 rounded-[1rem] mb-6 transition-all
            ${esCuadrePerfecto ? 'bg-[#00C193]/10 text-[#00C193]' : 
              esFaltante ? 'bg-red-500/10 text-red-600' : 
              'bg-blue-500/10 text-blue-600'}`}
          >
            {esCuadrePerfecto && <><CheckCircle2 className="w-5 h-5" /> ¡Cuadre perfecto!</>}
            {esFaltante && <><ArrowDownCircle className="w-5 h-5" /> Faltante: S/ {Math.abs(diferencia).toFixed(2)}</>}
            {!esCuadrePerfecto && !esFaltante && <><ArrowUpCircle className="w-5 h-5" /> Sobrante: S/ {diferencia.toFixed(2)}</>}
          </div>
        )}

        {/* Mensaje de Error */}
        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm font-bold mb-6 bg-red-50 p-4 rounded-[1rem] border border-red-100">
            <AlertCircle className="w-5 h-5 shrink-0" /> 
            <span>{error}</span>
          </div>
        )}

        {/* Botón de Acción */}
        <button 
            onClick={handleCerrar} 
            disabled={loading || montoReal === '' || isNaN(parseFloat(montoReal))}
            className="w-full bg-slate-900 text-white font-black py-4 rounded-[1.5rem] hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-900/20"
        >
            {loading ? <Loader2 className="animate-spin w-6 h-6" /> : 'Confirmar Cierre'}
        </button>
      </div>
    </div>
  );
}