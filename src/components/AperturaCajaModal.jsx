import React, { useState, useEffect } from 'react';
import { Store, DollarSign, Lock, X, AlertCircle, Loader2 } from 'lucide-react';
import api from '../api/axiosConfig';

export default function AperturaCajaModal({ isOpen, onSuccess, onClose }) {
  const [cajas, setCajas] = useState([]);
  const [cajaSeleccionada, setCajaSeleccionada] = useState('');
  const [montoInicial, setMontoInicial] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(''); // Nuevo estado para manejo de errores visual

  useEffect(() => {
    if (isOpen) {
      api.get('/cajas')
        .then(res => {
          setCajas(res.data);
          if (res.data.length > 0) setCajaSeleccionada(res.data[0].idCaja);
        })
        .catch(err => {
          console.error("Error cargando cajas", err);
          setError("No se pudieron cargar las cajas disponibles.");
        });
    } else {
      // Limpiar estados al cerrar
      setError('');
      setMontoInicial('');
    }
  }, [isOpen]);

  const handleAbrirCaja = async (e) => {
    e.preventDefault();
    const monto = parseFloat(montoInicial);
    
    if (!cajaSeleccionada) {
      setError("Por favor, selecciona una caja.");
      return;
    }
    
    if (isNaN(monto) || monto < 0) {
      setError("Ingresa un monto inicial válido.");
      return;
    }
    
    const idUsuarioActual = localStorage.getItem('idUsuario');
    
    setCargando(true);
    setError('');
    
    try {
      await api.post('/turnos/abrir', {
        idCaja: cajaSeleccionada,
        montoInicial: monto,
        idUsuario: idUsuarioActual
      });
      onSuccess(); 
    } catch (error) {
      console.error("Error al abrir caja", error);
      setError(error.response?.data?.message || "Ocurrió un error al intentar abrir la caja.");
    } finally {
      setCargando(false);
    }
  };

  if (!isOpen) return null;

  const rol = localStorage.getItem('rol');
  const puedeCerrar = rol === 'SUPER_ADMIN';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md transition-all p-4">
      <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-[0_20px_50px_rgba(8,_112,_184,_0.07)] relative">
        
        {/* Botón X */}
        {puedeCerrar && (
          <button 
            onClick={!cargando ? onClose : undefined}
            disabled={cargando}
            className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-2 rounded-full transition-all disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Icono Cabecera */}
        <div className="flex items-center justify-center w-20 h-20 bg-orange-50 rounded-[1.5rem] mb-6 mx-auto relative shadow-inner">
          <Lock className="w-10 h-10 text-orange-500" />
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-[3px] border-white animate-pulse"></div>
        </div>
        
        <h2 className="text-2xl font-black text-center text-slate-800 mb-2 tracking-tight">Apertura de Caja</h2>
        <p className="text-center text-slate-500 font-medium text-sm mb-8 px-2">
          Tu turno está cerrado. Debes abrir caja indicando el saldo inicial en efectivo para procesar ventas.
        </p>

        <form onSubmit={handleAbrirCaja} className="space-y-5">
          {/* Selector de Caja */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">Selecciona tu Caja</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <Store className="w-5 h-5 text-slate-400" />
              </div>
              <select 
                className="w-full bg-[#F4F6F8] border-2 border-transparent text-slate-800 font-bold rounded-[1.5rem] pl-14 pr-4 py-4 outline-none focus:bg-white focus:border-[#00C193] focus:ring-4 focus:ring-[#00C193]/10 transition-all appearance-none cursor-pointer"
                value={cajaSeleccionada}
                onChange={(e) => setCajaSeleccionada(e.target.value)}
                disabled={cargando}
                required
              >
                {cajas.length === 0 ? (
                  <option value="" disabled>-- No hay cajas configuradas --</option>
                ) : (
                  <>
                    <option value="" disabled>-- Elige una caja --</option>
                    {cajas.map(c => (
                      <option key={c.idCaja} value={c.idCaja}>{c.nombre}</option>
                    ))}
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Input de Monto */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">Monto Inicial (Efectivo)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                <span className="text-slate-400 font-black text-lg">S/</span>
              </div>
              <input 
                type="number" 
                step="0.10"
                min="0"
                className="w-full bg-[#F4F6F8] border-2 border-transparent text-slate-800 font-black text-xl rounded-[1.5rem] pl-14 pr-4 py-4 outline-none focus:bg-white focus:border-[#00C193] focus:ring-4 focus:ring-[#00C193]/10 transition-all"
                placeholder="0.00"
                value={montoInicial}
                onChange={(e) => setMontoInicial(e.target.value)}
                disabled={cargando}
                required
              />
            </div>
          </div>

          {/* Banner de Error Visual */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm font-bold bg-red-50 p-4 rounded-[1.5rem] border border-red-100">
              <AlertCircle className="w-5 h-5 shrink-0" /> 
              <span>{error}</span>
            </div>
          )}

          {/* Botón de Acción Principal */}
          <button 
            type="submit" 
            disabled={cargando || cajas.length === 0}
            className={`w-full text-white font-black py-4 rounded-[1.5rem] transition-all mt-2 flex items-center justify-center gap-2 
              ${cajas.length === 0 
                ? 'bg-slate-300 shadow-none cursor-not-allowed' 
                : 'bg-[#00C193] hover:bg-[#00A880] shadow-lg shadow-[#00C193]/30 active:scale-[0.98]'}`}
          >
            {cargando ? (
              <><Loader2 className="animate-spin w-6 h-6" /> Procesando...</>
            ) : (
              <>Abrir Caja y Empezar <DollarSign className="w-6 h-6" /></>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}