import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { SedeContext } from '../../../context/SedeContext';
import { 
  CalendarDays, Clock, User, Target, 
  CheckCircle, XCircle, Search, AlertTriangle, DollarSign, MessageCircle,
  PlayCircle, CheckSquare, ChevronLeft, ChevronRight, Check
} from 'lucide-react';
import api from '../../../api/axiosConfig';

import Sidebar from '../../../components/Sidebar';

export default function GestionReservas() {
  const [reservas, setReservas] = useState([]);
  
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroFecha, setFiltroFecha] = useState(''); 
  
  const [paginaActual, setPaginaActual] = useState(1);
  const elementosPorPagina = 10;
  
  const [reservaToCancel, setReservaToCancel] = useState(null);
  const [reservaToPay, setReservaToPay] = useState(null);
  const [reservaToApprove, setReservaToApprove] = useState(null);
  
  // 🟢 NUEVOS ESTADOS PARA EL MODAL DE COBRO
  const [metodoPagoRestante, setMetodoPagoRestante] = useState('Efectivo');
  const [nroOperacionRestante, setNroOperacionRestante] = useState('');

  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [reservaForWhatsApp, setReservaForWhatsApp] = useState(null);
  const [waData, setWaData] = useState({ nombre: '', telefono: '' });

  const [mensajeFlotante, setMensajeFlotante] = useState({ visible: false, texto: '', tipo: 'success' });

  const { sedeActiva } = useContext(SedeContext);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const rol = localStorage.getItem('rol');
  const idSede = localStorage.getItem('idSede');

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    if (rol !== 'ADMIN' && rol !== 'SUPER_ADMIN') { navigate('/catalogo'); return; }
    cargarDatos();
    // eslint-disable-next-line
  }, [token, rol, navigate, sedeActiva]);

  useEffect(() => {
    setPaginaActual(1);
  }, [filtroTexto, filtroFecha]);

  const cargarDatos = async () => {
    try {
      const idSedeAUsar = rol === 'SUPER_ADMIN' ? (sedeActiva || 'GLOBAL') : idSede;
      const configHeader = { headers: { 'X-Sede-Activa': idSedeAUsar } };

      const [resReservas, resCanchas] = await Promise.all([
        api.get('/reservas', configHeader),
        api.get('/canchas', configHeader)
      ]);

      let misReservas = resReservas.data;

      if (rol !== 'SUPER_ADMIN') {
        const misCanchas = resCanchas.data.filter(c => c.sede && String(c.sede.idSede) === String(idSede));
        misReservas = resReservas.data.filter(r => {
          const idCanchaReserva = r.idCancha || r.cancha?.idCancha;
          const nombreCanchaReserva = r.nombreCancha || r.cancha?.nombre;
          
          return misCanchas.some(c => 
            (idCanchaReserva && String(c.idCancha) === String(idCanchaReserva)) || 
            (nombreCanchaReserva && c.nombre === nombreCanchaReserva)
          );
        });
      }

      const reservasOrdenadas = misReservas.sort((a, b) => 
        new Date(b.horaInicio) - new Date(a.horaInicio)
      );
      
      setReservas(reservasOrdenadas);
    } catch (error) {
      console.error("Error al cargar las reservas:", error);
    }
  };

  const mostrarMensaje = (texto, tipo = 'success') => {
    setMensajeFlotante({ visible: true, texto, tipo });
    setTimeout(() => setMensajeFlotante(prev => ({ ...prev, visible: false })), 3500);
  };

  const confirmarCancelacion = async () => {
    if (!reservaToCancel) return;
    try {
      const idSedeAUsar = rol === 'SUPER_ADMIN' ? (sedeActiva || 'GLOBAL') : idSede;
      const configHeader = { headers: { 'X-Sede-Activa': idSedeAUsar } };

      await api.delete(`/reservas/${reservaToCancel}`, configHeader);
      cargarDatos(); 
      mostrarMensaje('Reserva anulada con éxito', 'success');
    } catch (error) {
      mostrarMensaje('Error al anular la reserva.', 'error');
    } finally {
      setReservaToCancel(null);
    }
  };

  const confirmarPagoRestante = async () => {
    if (!reservaToPay) return;

    const adelantoActual = reservaToPay.adelanto != null ? reservaToPay.adelanto : 0;
    const montoRestante = (reservaToPay.total || 0) - adelantoActual;

    // 🟢 VALIDACIÓN DE CÓDIGO
    if ((metodoPagoRestante === 'Yape' || metodoPagoRestante === 'Plin') && nroOperacionRestante.length < 3) {
      mostrarMensaje(`Ingresa un código de validación correcto para ${metodoPagoRestante}`, 'error');
      return;
    }

    // 🟢 ARMAMOS EL JSON DINÁMICO
    const datosPago = {
      metodoPago: metodoPagoRestante, // Ahora enviará Efectivo, Yape o Plin
      monto: montoRestante,
      rol: rol,
      codigoOperacion: nroOperacionRestante // Enviamos el código a Spring Boot
    };

    let idSedeCobro = rol === 'SUPER_ADMIN' ? sedeActiva : idSede;
    if (!idSedeCobro || idSedeCobro === 'GLOBAL') {
      idSedeCobro = reservaToPay.cancha?.sede?.idSede || reservaToPay.idSede;
    }

    if (!idSedeCobro || idSedeCobro === 'GLOBAL') {
      mostrarMensaje('Por favor, selecciona una sede arriba para procesar el cobro.', 'error');
      setReservaToPay(null);
      return;
    }

    const configHeader = { headers: { 'X-Sede-Activa': idSedeCobro } };

    try {
      await api.put(`/reservas/${reservaToPay.idReserva}/pagar`, datosPago, configHeader);
      cargarDatos();
      mostrarMensaje('Pago completado con éxito', 'success');
    } catch (error) {
      console.error("Detalle del error:", error.response?.data);
      mostrarMensaje(error.response?.data?.message || 'Error al registrar el pago. Revisa si hay una caja abierta.', 'error');
    } finally {
      setReservaToPay(null);
    }
  };

  const confirmarAprobacion = async () => {
    if (!reservaToApprove) return;
    
    const reservaAprobada = reservaToApprove; 

    let idSedeCobro = rol === 'SUPER_ADMIN' ? (sedeActiva || 'GLOBAL') : idSede;
    if (idSedeCobro === 'GLOBAL') {
      idSedeCobro = reservaAprobada.cancha?.sede?.idSede || reservaAprobada.idSede || 'GLOBAL';
    }
    const configHeader = { headers: { 'X-Sede-Activa': idSedeCobro } };

    try {
      await api.put(`/reservas/${reservaAprobada.idReserva}/aprobar`, {}, configHeader);
      cargarDatos();
      mostrarMensaje('¡Reserva Confirmada Exitosamente!', 'success');
      
      setTimeout(() => {
        enviarRecordatorioWhatsApp(reservaAprobada);
      }, 300); 

    } catch (error) {
      mostrarMensaje('Error al aprobar la reserva', 'error');
    } finally {
      setReservaToApprove(null);
    }
  };

  const enviarRecordatorioWhatsApp = (reserva) => {
    let nombreObjetivo = reserva.nombreCliente || reserva.usuario?.nombre || 'Cliente';
    let telefonoObjetivo = reserva.telefonoCliente || reserva.usuario?.telefono || '';

    if (nombreObjetivo.toLowerCase().includes('admin') && !reserva.nombreCliente) {
      nombreObjetivo = '';
    }

    if (telefonoObjetivo) {
      abrirWhatsAppDirecto(reserva, nombreObjetivo || 'Cliente', telefonoObjetivo);
    } else {
      setWaData({ nombre: nombreObjetivo, telefono: '' });
      setReservaForWhatsApp(reserva);
      setShowPhoneModal(true);
    }
  };

  const procesarModalWhatsApp = () => {
    if (!waData.telefono) {
      mostrarMensaje('El número de teléfono es obligatorio', 'error');
      return;
    }
    abrirWhatsAppDirecto(reservaForWhatsApp, waData.nombre || 'Cliente', waData.telefono);
    setShowPhoneModal(false);
  };

  const abrirWhatsAppDirecto = (reserva, nombreClienteFinal, telefonoDestino) => {
    const adelanto = reserva.adelanto != null ? reserva.adelanto : 0;
    const restante = (reserva.total || 0) - adelanto;
    
    const hora = new Date(reserva.horaInicio).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    const fechaJuego = formatearFecha(reserva.horaInicio);
    
    const fechaCreacionOriginal = reserva.fechaReserva || reserva.createdAt || reserva.fechaCreacion;
    const fechaCreacionTickt = fechaCreacionOriginal ? formatearFecha(fechaCreacionOriginal) : formatearFecha(new Date());

    const nombreSede = reserva.cancha?.sede?.nombre || reserva.nombreSede || 'nuestra sede';

    const mensaje = `Hola *${nombreClienteFinal}* 👋\nTe escribimos de *${nombreSede}*.\n\n` +
                    `✅ Tienes una reserva confirmada:\n` +
                    `📅 *Día del partido:* ${fechaJuego}\n` +
                    `⏰ *Hora:* ${hora}\n` +
                    `🏟️ *Cancha:* ${reserva.cancha?.nombre || reserva.nombreCancha}\n\n` +
                    `💰 *Total del alquiler:* S/ ${(reserva.total || 0).toFixed(2)}\n` +
                    `✅ *Adelanto dado:* S/ ${adelanto.toFixed(2)}\n` +
                    (restante > 0 ? `⚠️ *Resta por pagar:* S/ ${restante.toFixed(2)}\n\n` : `✅ *Deuda cancelada al 100%*\n\n`) +
                    `📝 _(Reserva registrada el: ${fechaCreacionTickt})_\n\n` +
                    `¡Te esperamos en la cancha para el partido! ⚽🏃‍♂️`;

    const numeroLimpio = telefonoDestino.replace(/\s+/g, '');
    const urlWA = `https://api.whatsapp.com/send?phone=51${numeroLimpio}&text=${encodeURIComponent(mensaje)}`;
    
    window.open(urlWA, '_blank');
  };

  const formatearFecha = (fechaString) => {
    const opciones = { year: 'numeric', month: '2-digit', day: '2-digit' };
    return new Date(fechaString).toLocaleDateString('es-PE', opciones);
  };

  const extraerHora = (fechaString) => {
    return fechaString.split('T')[1].substring(0, 5);
  };

  const obtenerEstadoDinamico = (reserva) => {
    if (reserva.estado === 'Cancelada') {
      return { texto: 'Cancelada', clase: 'bg-red-50 text-red-600 border border-red-100', icono: <XCircle className="w-3.5 h-3.5"/> };
    }

    const ahora = new Date();
    const inicio = new Date(reserva.horaInicio);
    const fin = new Date(reserva.horaFin);

    if (ahora >= fin) {
      return { texto: 'Finalizada', clase: 'bg-slate-100 text-slate-500 border border-slate-200', icono: <CheckSquare className="w-3.5 h-3.5"/> };
    }

    if (ahora >= inicio && ahora < fin) {
      return { texto: 'En Curso', clase: 'bg-blue-50 text-blue-600 border border-blue-200 shadow-sm animate-pulse', icono: <PlayCircle className="w-3.5 h-3.5"/> };
    }

    if (reserva.estado === 'Pendiente') {
      return { texto: 'Pendiente Validar', clase: 'bg-orange-50 text-orange-600 border border-orange-200 shadow-sm animate-pulse', icono: <AlertTriangle className="w-3.5 h-3.5"/> };
    }

    return { texto: 'Confirmada', clase: 'bg-[#EAF9F1] text-[#2DBC73] border border-[#2DBC73]/30', icono: <CheckCircle className="w-3.5 h-3.5"/> };
  };

  const reservasFiltradas = reservas.filter(r => {
    const nombreBusqueda = r.nombreCliente || r.usuario?.nombre || '';
    const matchTexto = 
      (r.cancha?.nombre || r.nombreCancha || '').toLowerCase().includes(filtroTexto.toLowerCase()) ||
      nombreBusqueda.toLowerCase().includes(filtroTexto.toLowerCase());
    const matchFecha = filtroFecha ? r.horaInicio.startsWith(filtroFecha) : true;
    return matchTexto && matchFecha;
  });

  const totalPaginas = Math.ceil(reservasFiltradas.length / elementosPorPagina);
  const indiceUltimoElemento = paginaActual * elementosPorPagina;
  const indicePrimerElemento = indiceUltimoElemento - elementosPorPagina;
  const reservasPaginadas = reservasFiltradas.slice(indicePrimerElemento, indiceUltimoElemento);

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative p-4 md:p-8">
        
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl font-bold text-sm ${
            mensajeFlotante.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'
          } ${mensajeFlotante.tipo === 'success' ? 'bg-[#00C193] text-white' : 'bg-red-500 text-white'}`}
        >
          {mensajeFlotante.tipo === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          {mensajeFlotante.texto}
        </div>

        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 flex flex-col flex-1 min-h-0">
          
          <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-6 shrink-0">
            <div className="flex items-center gap-4">
              <div className="bg-[#E6F7F4] p-3 rounded-xl">
                <CalendarDays className="text-[#00C193] w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-800">Historial de Reservas</h1>
                <p className="text-slate-500 text-sm font-medium mt-1">Gestiona y monitorea las reservas de tus canchas.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
              <div className="relative w-full sm:w-48">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="date" 
                  className="w-full pl-10 pr-4 py-3 bg-[#F8FAFC] border border-slate-200 rounded-xl focus:border-[#00C193] outline-none font-bold text-slate-700 text-sm transition-all"
                  value={filtroFecha}
                  onChange={(e) => setFiltroFecha(e.target.value)}
                />
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Buscar por cancha o cliente..." 
                  className="w-full pl-10 pr-4 py-3 bg-[#F8FAFC] border border-slate-200 rounded-xl focus:border-[#00C193] outline-none font-bold text-slate-700 text-sm transition-all"
                  value={filtroTexto}
                  onChange={(e) => setFiltroTexto(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="overflow-auto flex-1 custom-scrollbar">
            <table className="w-full text-left border-collapse relative">
              <thead className="sticky top-0 z-10 bg-slate-50 outline outline-1 outline-slate-100 shadow-sm">
                <tr className="text-slate-400 font-black uppercase text-[10px] tracking-widest">
                  <th className="p-5 pl-8 bg-slate-50">Fecha / Hora</th>
                  <th className="p-5 bg-slate-50">Cancha</th>
                  <th className="p-5 bg-slate-50">Cliente</th>
                  <th className="p-5 bg-slate-50">Estado Pago</th>
                  <th className="p-5 bg-slate-50">Estado Reserva</th>
                  <th className="p-5 text-center pr-8 bg-slate-50">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reservasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-12 text-center text-slate-400 font-medium">
                      No se encontraron reservas con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  reservasPaginadas.map((reserva) => {
                    const adelanto = reserva.adelanto != null ? reserva.adelanto : 0;
                    const restante = (reserva.total || 0) - adelanto;
                    const nombreMostrar = reserva.nombreCliente || reserva.usuario?.nombre || 'Cliente';

                    return (
                      <tr key={reserva.idReserva} className="hover:bg-slate-50 transition-colors group">
                        <td className="p-5 pl-8">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800">{formatearFecha(reserva.horaInicio)}</span>
                            <span className="text-sm text-slate-500 font-medium flex items-center gap-1.5 mt-1">
                              <Clock className="w-3.5 h-3.5 text-[#00C193]" /> {extraerHora(reserva.horaInicio)} - {extraerHora(reserva.horaFin)}
                            </span>
                          </div>
                        </td>
                        <td className="p-5">
                          <span className="font-bold text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2 w-fit">
                            <Target className="w-4 h-4 text-[#00C193]" /> {reserva.nombreCancha || reserva.cancha?.nombre || 'N/A'}
                          </span>
                        </td>
                        <td className="p-5">
                          <span className="text-slate-600 font-bold flex items-center gap-2">
                            <div className="bg-blue-50 p-1.5 rounded-full"><User className="w-4 h-4 text-blue-500" /></div>
                            <span className="capitalize">{nombreMostrar}</span>
                          </span>
                        </td>
                        
                        <td className="p-5">
                          <div className="flex flex-col gap-1 text-sm">
                            <span className="font-bold text-slate-800">Total: S/ {(reserva.total || 0).toFixed(2)}</span>
                            
                            {adelanto > 0 && (
                              <span className="text-blue-600 font-medium">Adelanto: S/ {adelanto.toFixed(2)}</span>
                            )}
                            
                            {restante > 0 ? (
                                <span className="font-bold text-orange-500">
                                  Saldo: S/ {restante.toFixed(2)}
                                </span>
                            ) : (
                                <span className="font-bold text-[#00C193]">
                                  Pagado al 100%
                                </span>
                            )}

                            {reserva.codigo_operacion && (
                              <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md w-fit mt-1 border border-slate-200">
                                REF: {reserva.codigo_operacion}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="p-5">
                          {(() => {
                            const estadoObj = obtenerEstadoDinamico(reserva);
                            return (
                              <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex w-fit items-center gap-1.5 transition-all ${estadoObj.clase}`}>
                                {estadoObj.icono}
                                {estadoObj.texto}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="p-5 pr-8">
                          <div className="flex items-center justify-center gap-2">
                            
                            {reserva.estado === 'Pendiente' && (
                              <button 
                                onClick={() => setReservaToApprove(reserva)}
                                className="text-xs font-bold text-[#00C193] bg-[#EAF9F1] hover:bg-[#00C193] hover:text-white px-3 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1 border border-[#00C193]/30"
                                title="Aprobar Voucher"
                              >
                                <Check className="w-4 h-4" /> Aprobar
                              </button>
                            )}

                            {restante > 0 && reserva.estado !== 'Cancelada' && reserva.estado !== 'Pendiente' && (
                              <button 
                                // 🟢 AL ABRIR EL MODAL, LIMPIAMOS LOS DATOS DE PAGO
                                onClick={() => {
                                  setReservaToPay(reserva);
                                  setMetodoPagoRestante('Efectivo');
                                  setNroOperacionRestante('');
                                }}
                                className="text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 px-4 py-2 rounded-xl transition-all shadow-sm"
                                title="Saldar Deuda"
                              >
                                Completar Pago
                              </button>
                            )}

                            {reserva.estado !== 'Pendiente' && (
                               <button 
                                 onClick={() => enviarRecordatorioWhatsApp(reserva)}
                                 className="text-xs font-bold text-white bg-[#25D366] hover:bg-[#1EBE57] px-4 py-2 rounded-xl transition-all shadow-sm shadow-[#25D366]/30"
                               >
                                 WhatsApp
                               </button>
                            )}
                            
                            {reserva.estado !== 'Cancelada' && restante > 0 && (
                              <button 
                                onClick={() => setReservaToCancel(reserva.idReserva)}
                                className="text-xs font-bold text-red-500 hover:text-white hover:bg-red-500 px-4 py-2 rounded-xl transition-all shadow-sm border border-red-100"
                              >
                                Anular
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {reservasFiltradas.length > 0 && (
            <div className="p-5 border-t border-slate-100 bg-white rounded-b-[2rem] flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
              
              <div className="text-sm font-medium text-slate-500 text-center md:text-left">
                Mostrando del <span className="font-black text-slate-800">{indicePrimerElemento + 1}</span> al <span className="font-black text-slate-800">{Math.min(indiceUltimoElemento, reservasFiltradas.length)}</span> de <span className="font-black text-[#00C193]">{reservasFiltradas.length}</span> reservas en total
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                
                <span className="text-sm font-black text-slate-700 bg-slate-100 px-4 py-2 rounded-xl border border-slate-200">
                  Página {paginaActual} de {totalPaginas}
                </span>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => setPaginaActual(prev => Math.max(prev - 1, 1))}
                    disabled={paginaActual === 1}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-slate-600 font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 hover:border-[#00C193] hover:text-[#00C193] transition-all shadow-sm"
                  >
                    <ChevronLeft className="w-4 h-4" /> Anterior
                  </button>
                  <button 
                    onClick={() => setPaginaActual(prev => Math.min(prev + 1, totalPaginas))}
                    disabled={paginaActual === totalPaginas}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-slate-600 font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 hover:border-[#00C193] hover:text-[#00C193] transition-all shadow-sm"
                  >
                    Siguiente <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {showPhoneModal && reservaForWhatsApp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-[#EAF9F1] rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageCircle className="w-8 h-8 text-[#25D366]" />
            </div>
            <h3 className="text-xl font-black text-slate-800 text-center mb-2">Enviar Ticket</h3>
            <p className="text-slate-500 text-center text-xs mb-6 font-medium">
              Verifica el nombre del cliente y su número de WhatsApp antes de enviar.
            </p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Nombre del Cliente</label>
                <input 
                  type="text" 
                  placeholder="Ej: Juan Pérez" 
                  className="w-full p-3 bg-[#F8FAFC] border border-slate-200 rounded-xl focus:border-[#25D366] outline-none text-sm font-bold text-slate-700 transition-all"
                  value={waData.nombre}
                  onChange={(e) => setWaData({...waData, nombre: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Número de Celular</label>
                <input 
                  type="text" 
                  placeholder="Ej: 999 888 777" 
                  className="w-full p-3 bg-[#F8FAFC] border border-slate-200 rounded-xl focus:border-[#25D366] outline-none text-sm font-bold text-slate-700 transition-all"
                  value={waData.telefono}
                  onChange={(e) => setWaData({...waData, telefono: e.target.value})}
                  onKeyDown={(e) => { if(e.key === 'Enter') procesarModalWhatsApp(); }}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowPhoneModal(false)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                Cancelar
              </button>
              <button 
                onClick={procesarModalWhatsApp}
                disabled={!waData.telefono} 
                className="flex-1 px-4 py-3 bg-[#25D366] text-white font-bold rounded-xl hover:bg-[#1EBE57] shadow-lg shadow-[#25D366]/30 transition-colors disabled:opacity-50 disabled:shadow-none"
              >
                Abrir Chat
              </button>
            </div>
          </div>
        </div>
      )}
      
      {reservaToApprove && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-[#EAF9F1] rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-[#00C193]" />
            </div>
            <h3 className="text-xl font-black text-slate-800 text-center mb-2">¿Aprobar Reserva?</h3>
            <p className="text-slate-500 text-center text-sm mb-8 font-medium">
              Asegúrate de haber recibido el Yape/Plin de <span className="font-bold text-slate-800">{reservaToApprove.nombreCliente}</span> antes de confirmar. La cancha quedará bloqueada.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setReservaToApprove(null)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                Regresar
              </button>
              <button onClick={confirmarAprobacion} className="flex-1 px-4 py-3 bg-[#00C193] text-white font-bold rounded-xl hover:bg-[#00A880] shadow-lg shadow-[#00C193]/30 transition-colors">
                Sí, Aprobar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🟢 MODAL DE PAGO ACTUALIZADO CON MÉTODOS Y CÓDIGO */}
      {reservaToPay && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-xl font-black text-slate-800 text-center mb-1">Completar Pago</h3>
            
            <div className="bg-[#F8FAFC] rounded-2xl p-4 my-6 text-center border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Monto restante a cobrar</p>
              <span className="font-black text-slate-800 text-3xl">
                S/ {((reservaToPay.total || 0) - (reservaToPay.adelanto != null ? reservaToPay.adelanto : 0)).toFixed(2)}
              </span>
            </div>

            <div className="mb-5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">Método de Pago</label>
              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={() => setMetodoPagoRestante('Efectivo')} className={`py-2.5 rounded-xl text-xs font-bold transition-all border-2 flex items-center justify-center gap-1 ${metodoPagoRestante === 'Efectivo' ? 'border-[#00C193] bg-[#E6F7F4] text-[#00C193]' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                   Efectivo
                </button>
                <button type="button" onClick={() => setMetodoPagoRestante('Yape')} className={`py-2.5 rounded-xl text-xs font-bold transition-all border-2 flex items-center justify-center gap-1 ${metodoPagoRestante === 'Yape' ? 'border-purple-500 bg-purple-50 text-purple-600' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                   Yape
                </button>
                <button type="button" onClick={() => setMetodoPagoRestante('Plin')} className={`py-2.5 rounded-xl text-xs font-bold transition-all border-2 flex items-center justify-center gap-1 ${metodoPagoRestante === 'Plin' ? 'border-sky-500 bg-sky-50 text-sky-600' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                   Plin
                </button>
              </div>
            </div>

            {(metodoPagoRestante === 'Yape' || metodoPagoRestante === 'Plin') && (
              <div className="mb-6 animate-in fade-in slide-in-from-right-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Cód. de Aprobación *</label>
                <input 
                  type="text" 
                  maxLength="6"
                  placeholder="Mín. 3 dígitos" 
                  className={`w-full px-4 py-3 bg-[#F8FAFC] border-2 rounded-xl outline-none font-bold text-slate-700 transition-all ${metodoPagoRestante === 'Yape' ? 'focus:border-purple-500' : 'focus:border-sky-500'}`}
                  value={nroOperacionRestante}
                  onChange={(e) => setNroOperacionRestante(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            )}

            <div className="flex gap-3 mt-2">
              <button onClick={() => setReservaToPay(null)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                Cancelar
              </button>
              <button onClick={confirmarPagoRestante} className="flex-1 px-4 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 shadow-lg shadow-slate-200 transition-colors">
                Sí, Cobrar
              </button>
            </div>
          </div>
        </div>
      )}

      {reservaToCancel && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-black text-slate-800 text-center mb-2">¿Anular Reserva?</h3>
            <p className="text-slate-500 text-center text-sm mb-8 font-medium">
              El estado cambiará a "Cancelada" y la cancha volverá a estar libre. ¿Deseas continuar?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setReservaToCancel(null)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                Regresar
              </button>
              <button onClick={confirmarCancelacion} className="flex-1 px-4 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 transition-colors">
                Sí, Anular
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}