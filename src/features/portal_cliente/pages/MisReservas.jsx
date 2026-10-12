import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Calendar, Clock, MapPin, CheckCircle, XCircle, Activity, Image as ImageIcon, AlertCircle } from 'lucide-react';
import axios from 'axios';

export default function MisReservas() {
  const [reservas, setReservas] = useState([]);
  const [filtroActivo, setFiltroActivo] = useState('proximas'); 
  
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const idUsuario = localStorage.getItem('idUsuario');

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    cargarMisReservas();
  }, [token, navigate]);

  const cargarMisReservas = async () => {
    try {
      // CORRECCIÓN: Llamamos al endpoint específico del usuario en lugar de traer todas las reservas
      const res = await axios.get(`http://localhost:8080/api/reservas/usuario/${idUsuario}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // CORRECCIÓN: Verificamos que sea un array antes de procesar para evitar pantallas blancas
      if (Array.isArray(res.data)) {
        // Ordenamos las reservas por fecha (las más recientes primero) por si el backend no lo hizo
        const misReservasOrdenadas = res.data.sort((a, b) => new Date(b.horaInicio) - new Date(a.horaInicio));
        setReservas(misReservasOrdenadas);
      } else {
        setReservas([]);
      }
    } catch (error) {
      console.error("Error al cargar mis reservas:", error);
      setReservas([]); // Evita que la pantalla se rompa si hay error 500
    }
  };

  const esReservaProxima = (horaInicio, estado) => {
    const ahora = new Date();
    const fechaReserva = new Date(horaInicio);
    return fechaReserva >= ahora && estado !== 'Cancelada';
  };

  const reservasMostradas = reservas.filter(r => {
    if (filtroActivo === 'proximas') return esReservaProxima(r.horaInicio, r.estado);
    return !esReservaProxima(r.horaInicio, r.estado);
  });

  const formatearFecha = (fechaStr) => {
    const opciones = { day: 'numeric', month: 'short', year: 'numeric' };
    return new Date(fechaStr).toLocaleDateString('es-PE', opciones);
  };

  const formatearHora = (fechaStr) => {
    return new Date(fechaStr).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans pb-20">
      
      <div className="bg-white px-8 py-6 shadow-sm sticky top-0 z-30 flex items-center gap-4">
        <button onClick={() => navigate('/catalogo')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Mis Reservas</h1>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-8 mt-4">
        
        <div className="flex bg-white p-2 rounded-2xl shadow-sm border border-slate-100 mb-8 max-w-sm">
          <button 
            onClick={() => setFiltroActivo('proximas')}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${filtroActivo === 'proximas' ? 'bg-[#00C193] text-white shadow-md shadow-[#00C193]/20' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Próximos Partidos
          </button>
          <button 
            onClick={() => setFiltroActivo('historial')}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${filtroActivo === 'historial' ? 'bg-slate-800 text-white shadow-md shadow-slate-800/20' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Historial
          </button>
        </div>

        {reservasMostradas.length === 0 ? (
          <div className="bg-white rounded-[2rem] p-12 text-center border border-slate-100 border-dashed">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-black text-slate-700 mb-2">No hay reservas aquí</h3>
            <p className="text-slate-400 font-medium">
              {filtroActivo === 'proximas' 
                ? 'Aún no tienes partidos programados. ¡Ve al catálogo y reserva tu cancha!' 
                : 'Todavía no tienes un historial de partidos jugados.'}
            </p>
            {filtroActivo === 'proximas' && (
              <button onClick={() => navigate('/catalogo')} className="mt-8 bg-[#00C193] text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-[#00C193]/20 hover:bg-[#00A880] transition-all">
                Ver Canchas Disponibles
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-6">
            {reservasMostradas.map((reserva) => {
              const cancha = reserva.cancha;
              const yaPaso = !esReservaProxima(reserva.horaInicio, reserva.estado);
              const cancelada = reserva.estado === 'Cancelada';
              const pendiente = reserva.estado === 'Pendiente';

              return (
                <div key={reserva.idReserva} className="bg-white rounded-[2rem] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col md:flex-row transition-all hover:shadow-lg group relative">
                  
                  <div className="md:w-48 h-48 md:h-auto bg-slate-100 relative shrink-0">
                    {cancha?.urlImagen ? (
                      <img src={cancha.urlImagen} alt={cancha.nombre} className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${yaPaso ? 'grayscale opacity-70' : ''}`} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon className="w-10 h-10" /></div>
                    )}
                    
                    <div className="absolute top-4 left-4">
                      {cancelada ? (
                        <span className="bg-red-500/90 backdrop-blur text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                          <XCircle className="w-3.5 h-3.5" /> Cancelada
                        </span>
                      ) : yaPaso ? (
                        <span className="bg-slate-800/90 backdrop-blur text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                          <CheckCircle className="w-3.5 h-3.5" /> Finalizada
                        </span>
                      ) : pendiente ? (
                        <span className="bg-orange-500/90 backdrop-blur text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                          <Clock className="w-3.5 h-3.5" /> Pendiente
                        </span>
                      ) : (
                        <span className="bg-[#00C193]/90 backdrop-blur text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                          <Activity className="w-3.5 h-3.5" /> Confirmada
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-6 md:p-8 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h2 className={`text-2xl font-black ${cancelada ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                          {cancha?.nombre || 'Cancha Eliminada'}
                        </h2>
                      </div>
                      <p className="text-slate-500 text-sm flex items-center gap-1.5 mb-6">
                        <MapPin className="w-4 h-4 text-[#00C193]" /> Complejo Deportivo
                      </p>
                      
                      <div className="flex flex-wrap gap-6">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fecha</p>
                          <p className={`font-bold text-lg flex items-center gap-2 ${cancelada ? 'text-slate-400' : 'text-slate-700'}`}>
                            <Calendar className={`w-5 h-5 ${cancelada ? 'text-slate-300' : 'text-[#00C193]'}`} /> 
                            {formatearFecha(reserva.horaInicio)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Horario</p>
                          <p className={`font-bold text-lg flex items-center gap-2 ${cancelada ? 'text-slate-400' : 'text-slate-700'}`}>
                            <Clock className={`w-5 h-5 ${cancelada ? 'text-slate-300' : 'text-[#00C193]'}`} /> 
                            {formatearHora(reserva.horaInicio)} - {formatearHora(reserva.horaFin)}
                          </p>
                        </div>
                      </div>

                      {pendiente && (
                        <div className="mt-6 bg-orange-50 border border-orange-100 rounded-xl p-3 flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                          <p className="text-sm text-orange-800 font-medium leading-snug">
                            Tu reserva está a la espera de validación de pago. Un administrador confirmará tu cancha en breve.
                          </p>
                        </div>
                      )}

                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}