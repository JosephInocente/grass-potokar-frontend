import React, { useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Calendar, Clock, ChevronLeft, CheckCircle, AlertCircle, X, MapPin, Target, Maximize, User, MessageCircle } from 'lucide-react';
import axios from 'axios';
import { SedeContext } from '../../../context/SedeContext';

export default function NuevaReserva() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const idCanchaDesdeCatalogo = location.state?.idCancha || '';

  const [canchas, setCanchas] = useState([]);
  const [canchaSel, setCanchaSel] = useState(idCanchaDesdeCatalogo);
  
  // 🟢 CORRECCIÓN 1: Obtener la fecha actual exactamente en la zona horaria de Perú
  const obtenerFechaPeru = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  const [fecha, setFecha] = useState(obtenerFechaPeru());
  
  const [horasOcupadas, setHorasOcupadas] = useState([]);
  
  const [mensajeFlotante, setMensajeFlotante] = useState({ visible: false, texto: '', tipo: 'success' });
  
  const [showModal, setShowModal] = useState(false);
  const [horaSeleccionada, setHoraSeleccionada] = useState('');
  const [duracionHoras, setDuracionHoras] = useState(1);
  const [maxHorasPosibles, setMaxHorasPosibles] = useState(1);

  const [nombreCliente, setNombreCliente] = useState('');
  const [telefonoCliente, setTelefonoCliente] = useState('');
  
  const token = localStorage.getItem('token');
  const idUsuarioLogueado = localStorage.getItem('idUsuario');
  const rol = localStorage.getItem('rol'); 
  const idSedeGuardada = localStorage.getItem('idSede');

  const isAdmin = rol === 'SUPER_ADMIN' || rol === 'ADMIN';
  
  const [adelanto, setAdelanto] = useState('');
  const [metodoAdelanto, setMetodoAdelanto] = useState(isAdmin ? 'Fisico' : 'Yape');
  const [nroOperacion, setNroOperacion] = useState('');

  const { sedeActiva } = useContext(SedeContext);

  const URL_QR = "https://i.ibb.co/DHnCVFcb/Whats-App-Image-2026-05-20-at-9-18-33-AM.jpg";

  const horariosBus = [
    "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", 
    "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", 
    "20:00", "21:00", "22:00"
  ];

  useEffect(() => { 
    if (!token) navigate('/login');
    cargarCanchas(); 
    // eslint-disable-next-line
  }, [token, navigate, sedeActiva]);

  useEffect(() => {
    if (canchaSel && fecha) consultarDisponibilidad();
    // eslint-disable-next-line
  }, [canchaSel, fecha]);

  const cargarCanchas = async () => {
    try {
      const res = await axios.get('http://localhost:8080/api/canchas', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let canchasFiltradas = res.data;
      
      if (rol === 'SUPER_ADMIN' && sedeActiva !== 'GLOBAL') {
        canchasFiltradas = res.data.filter(c => c.sede && String(c.sede.idSede) === String(sedeActiva));
      } else if (rol === 'ADMIN') {
        canchasFiltradas = res.data.filter(c => c.sede && String(c.sede.idSede) === String(idSedeGuardada));
      }

      setCanchas(canchasFiltradas);
      if (!idCanchaDesdeCatalogo && canchasFiltradas.length > 0) {
        setCanchaSel(canchasFiltradas[0].idCancha);
      } else if (canchasFiltradas.length === 0) {
        setCanchaSel('');
      }
    } catch (err) { console.error(err); }
  };

  const consultarDisponibilidad = async () => {
    try {
        const res = await axios.get(`http://localhost:8080/api/reservas`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const estadosOcupados = ['Confirmada', 'Pendiente', 'En Curso', 'Finalizada', 'Pagada'];
        
        const ocupadas = res.data
            .filter(r => r.idCancha && String(r.idCancha) === String(canchaSel) && r.horaInicio.startsWith(fecha) && estadosOcupados.includes(r.estado))
            .flatMap(r => {
                const hInicio = parseInt(r.horaInicio.split('T')[1].substring(0, 2));
                const hFin = parseInt(r.horaFin.split('T')[1].substring(0, 2));
                let bloqueadas = [];
                for(let i = hInicio; i < hFin; i++) {
                    bloqueadas.push(`${i < 10 ? '0'+i : i}:00`);
                }
                return bloqueadas;
            });
        setHorasOcupadas(ocupadas);
    } catch (err) { console.error(err); }
  };

  const mostrarMensaje = (texto, tipo = 'success') => {
    setMensajeFlotante({ visible: true, texto, tipo });
    setTimeout(() => setMensajeFlotante(prev => ({ ...prev, visible: false })), 3500);
  };

  const prepararReserva = (hora) => {
    setHoraSeleccionada(hora);
    setDuracionHoras(1);
    setNombreCliente(isAdmin ? '' : localStorage.getItem('nombre') || '');
    setTelefonoCliente('');
    setAdelanto('');
    setMetodoAdelanto(isAdmin ? 'Fisico' : 'Yape');
    setNroOperacion('');
    
    let max = 1;
    let hInt = parseInt(hora.split(':')[0]);
    
    while(max < 4) {
        let siguienteHoraStr = `${hInt + max < 10 ? '0'+(hInt + max) : hInt + max}:00`;
        if (horasOcupadas.includes(siguienteHoraStr) || (hInt + max >= 23)) break;
        max++;
    }
    
    setMaxHorasPosibles(max);
    setShowModal(true);
  };

  const canchaActual = canchas.find(c => String(c.idCancha) === String(canchaSel));
  const hInicioInt = parseInt(horaSeleccionada.split(':')[0]);
  const esNoche = hInicioInt >= 18;
  const precioUsar = esNoche ? (canchaActual?.precioNoche || 0) : (canchaActual?.precioDia || 0);
  const totalCalculado = precioUsar * duracionHoras;

  const confirmarReserva = async () => {
    if (!nombreCliente.trim() || !telefonoCliente.trim()) {
      mostrarMensaje('El nombre y el WhatsApp del jugador son obligatorios.', 'error');
      return;
    }

    const montoAdelanto = adelanto !== '' ? parseFloat(adelanto) : 0;
    
    if ((metodoAdelanto === 'Yape' || metodoAdelanto === 'Plin') && montoAdelanto > 0 && nroOperacion.length < 3) {
      mostrarMensaje(`Ingresa el código de aprobación válido para ${metodoAdelanto}`, 'error');
      return; 
    }

    const horaInicio = `${fecha}T${horaSeleccionada}:00`;
    const hFin = hInicioInt + duracionHoras;
    const horaFin = `${fecha}T${hFin < 10 ? '0'+hFin : hFin}:00`;
    
    const estadoReserva = isAdmin ? 'Confirmada' : 'Pendiente';

    try {
      await axios.post('http://localhost:8080/api/reservas', {
        cancha: { idCancha: canchaSel },
        usuario: { idUsuario: idUsuarioLogueado },
        horaInicio: horaInicio,
        horaFin: horaFin,
        estado: estadoReserva,
        total: totalCalculado,
        adelanto: montoAdelanto,
        nombreCliente: nombreCliente,
        telefonoCliente: telefonoCliente,
        codigoOperacion: (metodoAdelanto === 'Yape' || metodoAdelanto === 'Plin') && montoAdelanto > 0 ? nroOperacion : null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setShowModal(false);
      mostrarMensaje(
        isAdmin ? '¡Reserva confirmada con éxito!' : '¡Pre-reserva registrada! Espera la confirmación del administrador.', 
        'success'
      );
      consultarDisponibilidad();
      
      setTimeout(() => {
        isAdmin ? navigate('/dashboard') : navigate('/mis-reservas'); 
      }, 3000);
      
    } catch (error) {
      console.error(error);
      setShowModal(false);
      mostrarMensaje(error.response?.data?.message || 'Error al procesar la reserva. Intenta de nuevo.', 'error');
    }
  };

  // 🟢 CORRECCIÓN 2: Fecha mínima sincronizada
  const fechaMinima = obtenerFechaPeru();

  // 🟢 CORRECCIÓN 3: Obtener la hora actual exacta en Perú para bloquear horarios correctamente
  const obtenerHoraActualPeru = () => {
    const formatter = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', hour: '2-digit', hour12: false });
    return parseInt(formatter.format(new Date()));
  };
  const horaActualPeru = obtenerHoraActualPeru();

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 font-sans relative">
      <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl font-bold text-sm ${mensajeFlotante.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'} ${mensajeFlotante.tipo === 'success' ? 'bg-[#00C193] text-white' : 'bg-red-500 text-white'}`}>
        {mensajeFlotante.tipo === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
        {mensajeFlotante.texto}
      </div>

      <button onClick={() => navigate(isAdmin ? '/dashboard' : '/catalogo')} className="flex items-center gap-2 text-slate-500 mb-8 hover:text-[#00C193] transition-colors font-bold">
        <ChevronLeft className="w-5 h-5" /> {isAdmin ? 'Volver al Dashboard' : 'Volver al Catálogo'}
      </button>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUMNA IZQUIERDA: RESUMEN DE LA CANCHA */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden sticky top-8">
            <div className="h-56 bg-slate-100 w-full relative">
              {canchaActual?.urlImagen ? (
                <img src={canchaActual.urlImagen} alt="Cancha" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <MapPin className="w-12 h-12" />
                </div>
              )}
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-black text-slate-800 mb-4">{canchaActual ? canchaActual.nombre : 'Selecciona una cancha'}</h2>
              
              {canchaActual && (
                <>
                  <div className="flex items-center gap-3 text-sm font-bold text-slate-500 mb-6">
                    <span className="flex items-center gap-1"><Target className="w-4 h-4 text-[#00C193]"/> {canchaActual.tipoGrass}</span>
                    <span className="text-slate-300">•</span>
                    <span className="flex items-center gap-1"><Maximize className="w-4 h-4 text-blue-500"/> {canchaActual.medidas}</span>
                  </div>
                  
                  <div className="bg-[#F8FAFC] p-5 rounded-2xl border border-slate-100">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-slate-500 font-bold text-xs uppercase tracking-wider">Precio Día</span>
                      <span className="font-black text-slate-800 text-lg">S/ {canchaActual.precioDia}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                      <span className="text-slate-500 font-bold text-xs uppercase tracking-wider">Precio Noche</span>
                      <span className="font-black text-slate-800 text-lg">S/ {canchaActual.precioNoche}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: FORMULARIO Y HORARIOS */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
            <h3 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3">
              <div className="bg-[#E6F7F4] text-[#00C193] w-10 h-10 rounded-full flex items-center justify-center text-lg">1</div>
              Detalles de la Reserva
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 block mb-2">Selecciona Cancha</label>
                <select 
                  className="w-full p-4 bg-[#F8FAFC] border-2 border-transparent rounded-2xl outline-none focus:border-[#00C193] focus:bg-white transition-all font-bold text-slate-700 appearance-none"
                  value={canchaSel} 
                  onChange={e => setCanchaSel(e.target.value)}
                >
                  <option value="" disabled>Elegir campo...</option>
                  {canchas.map(c => <option key={c.idCancha} value={c.idCancha}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 block mb-2">Fecha de Juego</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-[#00C193] w-5 h-5" />
                  <input 
                    type="date" 
                    className="w-full pl-12 pr-4 py-4 bg-[#F8FAFC] border-2 border-transparent rounded-2xl outline-none focus:border-[#00C193] focus:bg-white transition-all font-bold text-slate-700"
                    value={fecha} 
                    min={fechaMinima}
                    onChange={e => setFecha(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                <div className="bg-[#E6F7F4] text-[#00C193] w-10 h-10 rounded-full flex items-center justify-center text-lg">2</div>
                Horarios Disponibles
              </h3>
              
              <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest">
                <span className="flex items-center gap-1.5 text-slate-500"><div className="w-3 h-3 bg-[#E6F7F4] border border-[#00C193] rounded-sm"></div> Libre</span>
                <span className="flex items-center gap-1.5 text-slate-500"><div className="w-3 h-3 bg-blue-50 border border-blue-200 rounded-sm"></div> Ocupado</span>
                <span className="flex items-center gap-1.5 text-slate-500"><div className="w-3 h-3 bg-slate-100 border border-slate-200 rounded-sm"></div> Pasado</span>
              </div>
            </div>
            
            {!canchaSel ? (
              <div className="text-center py-12 bg-slate-50 rounded-3xl text-slate-400 font-medium border-2 border-dashed border-slate-200">
                Selecciona una cancha arriba para ver los horarios
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {horariosBus.map(h => {
                  const estaOcupado = horasOcupadas.includes(h);
                  const horaDeEsteSlot = parseInt(h.split(':')[0]);
                  const esMismoDia = fecha === fechaMinima;
                  
                  // 🟢 CORRECCIÓN 4: Verifica si el horario ya pasó basándose estrictamente en la hora de Perú
                  const yaPaso = esMismoDia && (horaDeEsteSlot <= horaActualPeru);
                  
                  let clasesCSS = "py-3 rounded-xl font-bold text-sm transition-all border-2 flex flex-col items-center justify-center gap-1 ";
                  
                  if (yaPaso) {
                      clasesCSS += "bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed opacity-60";
                  } else if (estaOcupado) {
                      clasesCSS += "bg-blue-50 border-blue-200 text-blue-500 cursor-not-allowed opacity-90";
                  } else {
                      clasesCSS += "bg-white border-slate-200 text-slate-600 hover:border-[#00C193] hover:text-[#00C193] hover:bg-[#E6F7F4] cursor-pointer shadow-sm";
                  }

                  return (
                    <button key={h} disabled={estaOcupado || yaPaso} onClick={() => prepararReserva(h)} className={clasesCSS}>
                      <Clock className={`w-4 h-4 mb-0.5 ${yaPaso || estaOcupado ? 'opacity-50' : ''}`} /> {h}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] overflow-hidden">
            
            <div className="p-6 pb-4 border-b border-slate-100 shrink-0 relative">
              <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-2xl font-black text-slate-800 mb-1">Completar Reserva</h2>
              <p className="text-slate-500 text-sm font-medium">Verifica los datos y registra {isAdmin ? 'al cliente' : 'tu partido'}.</p>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              
              <div className="bg-[#F8FAFC] p-5 rounded-3xl border border-slate-100 space-y-3 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">Cancha</span>
                  <span className="font-black text-slate-800 text-sm">{canchaActual?.nombre}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
                  <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">Fecha y Hora</span>
                  <span className="font-black bg-[#E6F7F4] text-[#00C193] px-2 py-1 rounded-md text-sm">
                    {fecha.split('-').reverse().join('/')} | {horaSeleccionada}
                  </span>
                </div>
              </div>
              
              <div className="mb-6">
                <label className="text-xs font-black text-slate-800 uppercase tracking-widest block mb-2">Duración del partido</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <select 
                    className="w-full pl-11 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl outline-none focus:border-[#00C193] transition-all font-bold text-slate-700 appearance-none shadow-sm text-sm"
                    value={duracionHoras}
                    onChange={(e) => setDuracionHoras(parseInt(e.target.value))}
                  >
                    {Array.from({ length: maxHorasPosibles }, (_, i) => i + 1).map(num => {
                       const hFin = parseInt(horaSeleccionada.split(':')[0]) + num;
                       return (
                         <option key={num} value={num}>
                           {num} {num === 1 ? 'Hora' : 'Horas'} (hasta las {hFin < 10 ? '0'+hFin : hFin}:00)
                         </option>
                       );
                    })}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Nombre del Jugador *</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                      type="text" 
                      placeholder="Ej: Juan Pérez" 
                      className="w-full pl-11 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl outline-none focus:border-[#00C193] font-bold text-slate-700 text-sm transition-all"
                      value={nombreCliente}
                      onChange={e => setNombreCliente(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">WhatsApp (Notificaciones) *</label>
                  <div className="relative">
                    <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                      type="text" 
                      placeholder="Ej: 999 888 777" 
                      className="w-full pl-11 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl outline-none focus:border-[#00C193] font-bold text-slate-700 text-sm transition-all"
                      value={telefonoCliente}
                      onChange={e => setTelefonoCliente(e.target.value)}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 mt-6">
                  <div className="mb-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Método de Adelanto</label>
                    <div className="grid grid-cols-3 gap-2">
                      {isAdmin && (
                        <button type="button" onClick={() => setMetodoAdelanto('Fisico')} className={`py-2.5 rounded-xl text-xs font-bold transition-all border-2 flex items-center justify-center gap-1 ${metodoAdelanto === 'Fisico' ? 'border-[#00C193] bg-[#E6F7F4] text-[#00C193]' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                           Físico
                        </button>
                      )}
                      <button type="button" onClick={() => setMetodoAdelanto('Yape')} className={`py-2.5 rounded-xl text-xs font-bold transition-all border-2 flex items-center justify-center gap-1 ${metodoAdelanto === 'Yape' ? 'border-purple-500 bg-purple-50 text-purple-600' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                         Yape
                      </button>
                      <button type="button" onClick={() => setMetodoAdelanto('Plin')} className={`py-2.5 rounded-xl text-xs font-bold transition-all border-2 flex items-center justify-center gap-1 ${metodoAdelanto === 'Plin' ? 'border-sky-500 bg-sky-50 text-sky-600' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                         Plin
                      </button>
                    </div>
                  </div>

                  {(metodoAdelanto === 'Yape' || metodoAdelanto === 'Plin') && (
                    <div className="my-4 p-5 bg-slate-50 rounded-2xl flex flex-col items-center justify-center gap-3 border border-slate-200 text-center">
                       <div className="w-48 h-48 bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex-shrink-0">
                          <img src={URL_QR} alt="QR" className="w-full h-full object-contain" />
                       </div>
                       <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Escanea el QR o envía a:</p>
                          <p className="text-xl font-black text-slate-800 mt-1">933 139 172</p>
                          <p className="text-[10px] font-bold text-slate-500">A nombre de: <span className="text-[#00C193]">Complejo Deportivo</span></p>
                       </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                    <div>
                      <label className="text-[10px] font-black text-[#FF8A00] uppercase tracking-widest block mb-1.5">Monto Transferido (S/)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-[#FF8A00]">S/</span>
                        <input 
                          type="number" 
                          placeholder="0.00" 
                          className="w-full pl-10 pr-4 py-3 bg-[#FFF8F0] border-2 border-[#FFE8CC] text-[#FF8A00] rounded-xl outline-none font-black transition-all focus:border-[#FF8A00]"
                          value={adelanto}
                          onChange={(e) => {
                             let val = parseFloat(e.target.value);
                             if (isNaN(val)) {
                               setAdelanto(''); 
                               return;
                             }
                             if (val < 0) val = 0;
                             if (val > totalCalculado) val = totalCalculado; 
                             setAdelanto(val);
                          }}
                        />
                      </div>
                    </div>

                    {(metodoAdelanto === 'Yape' || metodoAdelanto === 'Plin') && (
                       <div className="animate-in fade-in slide-in-from-right-4">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Cód. de Aprobación *</label>
                         <input 
                           type="text" 
                           maxLength="6"
                           placeholder="Mín. 3 dígitos" 
                           className={`w-full px-4 py-3 bg-[#F8FAFC] border-2 rounded-xl outline-none font-bold text-slate-700 transition-all ${metodoAdelanto === 'Yape' ? 'focus:border-purple-500' : 'focus:border-sky-500'}`}
                           value={nroOperacion}
                           onChange={(e) => setNroOperacion(e.target.value.replace(/\D/g, ''))}
                         />
                       </div>
                    )}
                  </div>
                  
                  {!isAdmin && (
                    <div className="bg-white px-4 py-3 rounded-xl mt-4 shadow-sm border border-[#EBEFFF] w-full text-center">
                      <p className="text-xs text-slate-600 font-medium">Una vez hecho el pago, tu reserva quedará como <span className="font-bold text-orange-500">Pendiente</span> hasta que verifiquemos el monto.</p>
                    </div>
                  )}

                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0 rounded-b-[2rem]">
              <div className="flex items-center justify-between bg-slate-900 text-white p-4 rounded-2xl mb-4 shadow-lg">
                <div>
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Total a Pagar</span>
                  <span className="text-xs text-slate-300">({esNoche ? 'Tarifa Noche' : 'Tarifa Día'} x {duracionHoras}h)</span>
                </div>
                <span className="text-2xl font-black text-[#00C193]">S/ {totalCalculado.toFixed(2)}</span>
              </div>

              <button 
                onClick={confirmarReserva} 
                className="w-full bg-[#00C193] text-white font-black py-4 rounded-xl hover:bg-[#00A880] shadow-lg shadow-[#00C193]/30 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                {isAdmin ? 'Confirmar y Agendar' : 'Pre-reservar Cancha'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}