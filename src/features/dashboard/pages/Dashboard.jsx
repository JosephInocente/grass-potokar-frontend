import React, { useEffect, useState, useContext, useMemo } from 'react'; 
import { SedeContext } from '../../../context/SedeContext';
import { useNavigate } from 'react-router-dom'; 
import { 
  CalendarCheck, Clock, AlertCircle, Plus, Store, TrendingUp, Wallet, CheckCircle2, 
  BarChart3, Filter, Star, ShoppingBag, ArrowUpRight, ShoppingCart, CalendarDays, User, ChevronDown
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';
import api from '../../../api/axiosConfig';

import Sidebar from '../../../components/Sidebar';
import AperturaCajaModal from '../../../components/AperturaCajaModal';
import CerrarCajaModal from '../../../components/CerrarCajaModal'; 

export default function Dashboard() {
  // --- 1. ESTADOS DE DATOS (RAW DATA) ---
  const [reservas, setReservas] = useState([]);
  const [canchas, setCanchas] = useState([]);
  const [ventas, setVentas] = useState([]); 
  const [sedes, setSedes] = useState([]); 
  
  // --- 2. ESTADOS DE RESUMEN BACKEND (KPIs PRINCIPALES) ---
  const [resumenBackend, setResumenBackend] = useState({
    canchasActivas: 0,
    reservasFiltro: 0,
    ingresosFiltro: 0,
    canceladasFiltro: 0,
    ingresosReservas: 0,
    partidosCobrados: 0,
    ingresosTienda: 0,
    ventasRealizadas: 0,
    estadoCompletadas: 0,
    estadoCanceladas: 0
  });
  
  // --- 3. ESTADOS DE CONTROL OPERATIVO ---
  const [requiereApertura, setRequiereApertura] = useState(false);
  const [isCerrarCajaOpen, setIsCerrarCajaOpen] = useState(false);
  const [turnoActivo, setTurnoActivo] = useState(null); 
  const [loading, setLoading] = useState(true);
  
  // --- 4. CONFIGURACIÓN DE FILTROS ---
  const [globalFilter, setGlobalFilter] = useState('Histórico Total');

  // --- 5. CONTEXTOS Y NAVEGACIÓN ---
  const { sedeActiva, cambiarSede } = useContext(SedeContext);
  const navigate = useNavigate();
  
  // --- 6. DATOS DE SESIÓN ---
  const token = localStorage.getItem('token');
  const rol = localStorage.getItem('rol');
  const idSedeSession = localStorage.getItem('idSede');
  const idUsuario = localStorage.getItem('idUsuario'); 

  const COLORS_CAMPOS = ['#00C193', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F43F5E'];

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    if (rol !== 'ADMIN' && rol !== 'SUPER_ADMIN') { navigate('/catalogo'); return; }
    
    api.get('/sedes')
      .then(res => setSedes(res.data))
      .catch(err => console.error("Error al obtener sedes:", err));
    
    cargarDatosDashboard();
    // eslint-disable-next-line
  }, [token, rol, navigate, sedeActiva]);

  // 🟢 NUEVO: Cada vez que cambia el filtro, pedimos los totales directos al backend
  useEffect(() => {
    if (!token) return;
    const fetchResumen = async () => {
      try {
        const idSedeAUsar = rol === 'SUPER_ADMIN' ? (sedeActiva || 'GLOBAL') : idSedeSession;
        const configHeader = { headers: { 'X-Sede-Activa': idSedeAUsar } };
        const res = await api.get(`/dashboard/resumen?filtro=${globalFilter}`, configHeader);
        setResumenBackend(res.data);
      } catch (error) {
        console.error("Error obteniendo resumen del backend:", error);
      }
    };
    fetchResumen();
  }, [globalFilter, sedeActiva, token, rol, idSedeSession]);

  const cargarDatosDashboard = async () => {
    setLoading(true);
    try {
      const idSedeAUsar = rol === 'SUPER_ADMIN' ? (sedeActiva || 'GLOBAL') : idSedeSession;
      const configHeader = { headers: { 'X-Sede-Activa': idSedeAUsar } };

      if (rol === 'ADMIN') { 
        try {
          const resTurno = await api.get(`/turnos/estado?idUsuario=${idUsuario}`);
          setTurnoActivo(resTurno.data); 
          setRequiereApertura(false);
        } catch (error) {
          if (error.response?.status === 404) {
            setTurnoActivo(null);
            setRequiereApertura(true);
          }
        }
      }

      // Cargamos arrays para los gráficos de barras y caja de hoy (operativa diaria)
      const [resReservas, resCanchas, resVentas] = await Promise.all([
        api.get('/reservas', configHeader), 
        api.get('/canchas', configHeader),
        api.get('/ventas', configHeader)    
      ]);
      
      setCanchas(resCanchas.data || []);
      setReservas(resReservas.data || []);
      setVentas(resVentas.data || []);

    } catch (error) { 
      console.error("Error crítico en Dashboard:", error); 
    } finally {
      setLoading(false);
    }
  };

  const esMismoDia = (fechaString) => {
    if (!fechaString) return false;
    let str = String(fechaString).replace(' ', 'T');
    const dateObj = new Date(str);
    const hoy = new Date();
    return (
      dateObj.getDate() === hoy.getDate() &&
      dateObj.getMonth() === hoy.getMonth() &&
      dateObj.getFullYear() === hoy.getFullYear()
    );
  };

  const cajaHoy = useMemo(() => {
    const reservasHoyFull = reservas.filter(r => esMismoDia(r.horaInicio || r.fechaCreacion));
    
    const dineroReservas = reservasHoyFull
      .filter(r => ['Confirmada', 'En Curso', 'Finalizada', 'Completada', 'Pagada'].includes(r.estado))
      .reduce((sum, r) => {
        const monto = r.estado === 'Pagada' ? (Number(r.total) || 0) : (Number(r.adelanto) || 0);
        return sum + monto;
      }, 0);

    const ventasHoyFull = ventas.filter(v => 
      esMismoDia(v.fechaVenta || v.fechaCreacion) && v.estado !== 'Anulada' && v.estado !== 'Cancelada'
    );
    
    const dineroVentas = ventasHoyFull.reduce((sum, v) => sum + (Number(v.total || v.montoTotal) || 0), 0);
    
    const porCobrar = reservasHoyFull
      .filter(r => ['Confirmada', 'En Curso', 'Finalizada', 'Completada'].includes(r.estado))
      .reduce((sum, r) => {
        const restante = (Number(r.total) || 0) - (Number(r.adelanto) || 0);
        return sum + (restante > 0 ? restante : 0);
      }, 0);

    const proximas = reservasHoyFull
      .filter(r => {
         const esFutura = new Date(String(r.horaInicio).replace(' ', 'T')) >= new Date();
         return (esFutura && ['Confirmada', 'En Curso'].includes(r.estado));
      })
      .sort((a, b) => new Date(String(a.horaInicio).replace(' ', 'T')) - new Date(String(b.horaInicio).replace(' ', 'T')));

    return {
      dineroEnCajaCalculado: dineroReservas + dineroVentas,
      porCobrarHoy: porCobrar,
      proximasReservasList: proximas
    };
  }, [reservas, ventas]);

  // Gráficos y Top Productos
  const stats = useMemo(() => {
    const hoy = new Date();
    let labels = [];
    
    if (globalFilter === 'Diaria') labels = ['08:00', '10h', '12h', '14h', '16h', '18h', '20h', '22h'];
    else if (globalFilter === 'Semanal') labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    else if (globalFilter === 'Mensual') labels = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
    else if (globalFilter === 'Anual') labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    else labels = [hoy.getFullYear()-2, hoy.getFullYear()-1, hoy.getFullYear()].map(String);

    let dFinanzas = labels.map(label => ({ label, ingresosReservas: 0, ingresosTienda: 0 }));
    let dOcupacion = labels.map(label => {
        let obj = { label };
        canchas.forEach(c => obj[c.nombre] = 0);
        return obj;
    });

    const productosMap = {};

    let inicio = new Date(hoy); let fin = new Date(hoy);
    if (globalFilter === 'Diaria') { inicio.setHours(0,0,0,0); fin.setHours(23,59,59,999); }
    else if (globalFilter === 'Semanal') {
        const diff = hoy.getDate() - hoy.getDay() + (hoy.getDay() === 0 ? -6 : 1);
        inicio.setDate(diff); inicio.setHours(0,0,0,0);
        fin = new Date(inicio); fin.setDate(inicio.getDate() + 6); fin.setHours(23,59,59,999);
    } else if (globalFilter === 'Mensual') {
        inicio.setDate(1); inicio.setHours(0,0,0,0);
        fin = new Date(inicio); fin.setMonth(inicio.getMonth() + 1); fin.setDate(0); fin.setHours(23,59,59,999);
    } else if (globalFilter === 'Anual') {
        inicio.setMonth(0, 1); inicio.setHours(0,0,0,0);
        fin = new Date(inicio); fin.setFullYear(inicio.getFullYear() + 1); fin.setDate(0); fin.setHours(23,59,59,999);
    } else { inicio.setFullYear(2020, 0, 1); fin.setFullYear(2030, 11, 31); }

    const getIdx = (d) => {
        if (globalFilter === 'Diaria') return Math.floor((d.getHours() - 8) / 2);
        if (globalFilter === 'Semanal') { let i = d.getDay() - 1; return i === -1 ? 6 : i; }
        if (globalFilter === 'Mensual') return Math.min(Math.floor((d.getDate()-1) / 7), 3);
        if (globalFilter === 'Anual') return d.getMonth();
        return labels.indexOf(String(d.getFullYear()));
    };

    reservas.forEach(r => {
        const d = new Date(r.horaInicio.replace(' ', 'T'));
        if (d < inicio || d > fin) return;
        
        if (r.estado !== 'Cancelada' && r.estado !== 'Anulada') {
          const idx = getIdx(d);
          if (idx >= 0 && idx < labels.length && ['Confirmada', 'En Curso', 'Finalizada', 'Completada', 'Pagada'].includes(r.estado)) {
              const monto = r.estado === 'Pagada' ? (Number(r.total) || 0) : (Number(r.adelanto) || 0);
              dFinanzas[idx].ingresosReservas += monto;
              
              const cNom = r.cancha?.nombre || r.nombreCancha;
              if (cNom && dOcupacion[idx][cNom] !== undefined) dOcupacion[idx][cNom] += 1;
          }
        }
    });

    ventas.forEach(v => {
        if (v.estado === 'Anulada' || v.estado === 'Cancelada') return;
        const d = new Date((v.fechaVenta || v.fechaCreacion).replace(' ', 'T'));
        if (d < inicio || d > fin) return;
        
        const idx = getIdx(d);
        const monto = (Number(v.total || v.montoTotal) || 0);
        
        if (idx >= 0 && idx < labels.length) dFinanzas[idx].ingresosTienda += monto;
        
        if (v.detalles) {
            v.detalles.forEach(det => {
                const n = det.nombreProducto || det.producto?.nombre || 'Producto';
                productosMap[n] = (productosMap[n] || 0) + det.cantidad;
            });
        }
    });

    const topProds = Object.entries(productosMap)
        .map(([nombre, cantidad]) => ({ nombre, cantidad }))
        .sort((a,b) => b.cantidad - a.cantidad)
        .slice(0, 5);

    return { dataFinanzas: dFinanzas, dataOcupacion: dOcupacion, topProds };
  }, [reservas, ventas, canchas, globalFilter]);

  // 🟢 Datos Dinámicos del Pie Chart desde el Backend
  const pieDataBackend = [
    { name: 'Completadas', value: resumenBackend.estadoCompletadas || 0, color: '#1c3643' },
    { name: 'Canceladas', value: resumenBackend.estadoCanceladas || 0, color: '#f87171' }
  ].filter(x => x.value > 0);

  // Cálculos de porcentajes seguros
  const totalIngresos = resumenBackend.ingresosFiltro || 1;
  const pctReservas = (((resumenBackend.ingresosReservas || 0) / totalIngresos) * 100).toFixed(1);
  const pctTienda = (((resumenBackend.ingresosTienda || 0) / totalIngresos) * 100).toFixed(1);

  const getNombreSedeAdmin = () => {
    const sedeEncontrada = sedes.find(s => String(s.idSede) === String(idSedeSession));
    const nombreGuardadoLocal = localStorage.getItem('nombreSede');
    if (sedeEncontrada) return sedeEncontrada.nombre;
    if (nombreGuardadoLocal) return nombreGuardadoLocal;
    return `Sede ${idSedeSession}`;
  };

  return (
    <div className="flex h-screen bg-[#F4F6F8] font-sans overflow-hidden">
      <Sidebar />

      <main className="flex-1 h-screen overflow-y-auto p-4 md:p-6 lg:p-8 relative">
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 min-h-full mx-auto w-full flex flex-col overflow-hidden">
          
          <header className="p-6 md:p-8 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Dashboard</h1>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Análisis de Rendimiento Operativo</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
               <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl shadow-sm group hover:border-[#00C193] transition-all">
                  <Filter className="w-4 h-4 text-slate-400 group-hover:text-[#00C193]" />
                  <select 
                    className="bg-transparent outline-none font-black text-slate-700 text-xs cursor-pointer pr-2" 
                    value={globalFilter} 
                    onChange={(e) => setGlobalFilter(e.target.value)}
                  >
                    <option value="Diaria">Hoy</option>
                    <option value="Semanal">Esta Semana</option>
                    <option value="Mensual">Este Mes</option>
                    <option value="Anual">Este Año</option>
                    <option value="Histórico Total">Histórico Total</option>
                  </select>
               </div>

               {rol === 'SUPER_ADMIN' ? (
                 <div className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2.5 rounded-2xl shadow-lg border border-slate-700 hover:bg-slate-700 transition-all cursor-pointer relative">
                    <Store className="w-4 h-4 text-[#00C193]" />
                    <select 
                      className="bg-transparent outline-none font-black text-xs cursor-pointer appearance-none pr-6" 
                      value={sedeActiva || 'GLOBAL'} 
                      onChange={(e) => cambiarSede(e.target.value)}
                    >
                      <option value="GLOBAL" className="text-black">VISTA GLOBAL (TODOS)</option>
                      {sedes.map(s => (
                        <option key={s.idSede} value={s.idSede} className="text-black">
                          {s.nombre.toUpperCase()}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3 h-3 absolute right-3 text-slate-400 pointer-events-none" />
                 </div>
               ) : (
                 <div className="flex items-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-2xl shadow-lg">
                    <Store className="w-4 h-4 text-[#00C193]" />
                    <span className="text-xs font-black uppercase tracking-wider">
                      {getNombreSedeAdmin()}
                    </span>
                 </div>
               )}

              {rol === 'ADMIN' && turnoActivo && (
                <button 
                  onClick={() => setIsCerrarCajaOpen(true)}
                  className="flex items-center gap-2 bg-red-500 text-white px-5 py-2.5 rounded-2xl shadow-sm hover:bg-red-600 transition-colors text-xs font-black"
                >
                  <Wallet className="w-4 h-4" />
                  Cerrar Caja
                </button>
              )}
            </div>
          </header>

          <div className="p-6 md:p-8 w-full flex-1 space-y-8">
            {/* FILA 1: KPIs Principales Dinámicos CONECTADOS AL BACKEND */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="bg-[#EAF9F1] p-3 rounded-2xl text-[#00C193]"><CheckCircle2 /></div>
                <div><h3 className="text-xl font-black text-slate-800">{resumenBackend.canchasActivas || canchas.length}</h3><p className="text-[10px] font-bold text-slate-500 uppercase">Canchas Activas</p></div>
              </div>
              <div className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="bg-teal-50 p-3 rounded-2xl text-teal-600"><CalendarCheck /></div>
                <div><h3 className="text-xl font-black text-slate-800">{resumenBackend.reservasFiltro || 0}</h3><p className="text-[10px] font-bold text-slate-500 uppercase">Reservas (Filtro)</p></div>
              </div>
              <div className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="bg-blue-50/50 p-3 rounded-2xl text-blue-500"><Wallet /></div>
                <div><h3 className="text-xl font-black text-slate-800">S/ {(resumenBackend.ingresosFiltro || 0).toFixed(2)}</h3><p className="text-[10px] font-bold text-slate-500 uppercase">Ingresos (Filtro)</p></div>
              </div>
              <div className="bg-[#FFF5F5] p-5 rounded-[1.5rem] border border-red-100 shadow-sm flex items-center gap-4 text-red-600">
                <div className="bg-red-100 p-3 rounded-2xl text-red-600"><AlertCircle /></div>
                <div><h3 className="text-xl font-black">{resumenBackend.canceladasFiltro || 0}</h3><p className="text-[10px] font-bold uppercase text-red-400">Canceladas (Filtro)</p></div>
              </div>
            </div>

            {/* FILA 2: Desglose Específico de Ingresos CONECTADOS AL BACKEND */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center group hover:border-[#00C193] transition-all">
                  <div>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Ingresos por Reservas</p>
                    <h3 className="text-4xl font-black text-[#00C193]">S/ {(resumenBackend.ingresosReservas || 0).toFixed(2)}</h3>
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mt-2">
                       <CalendarDays className="w-4 h-4"/> {resumenBackend.partidosCobrados || 0} Partidos Cobrados
                    </div>
                  </div>
                  <div className="bg-[#EAF9F1] p-5 rounded-3xl group-hover:scale-110 transition-transform"><TrendingUp className="text-[#00C193] w-8 h-8"/></div>
               </div>
               <div className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center group hover:border-blue-500 transition-all">
                  <div>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Ingresos por Tienda / POS</p>
                    <h3 className="text-4xl font-black text-blue-600">S/ {(resumenBackend.ingresosTienda || 0).toFixed(2)}</h3>
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mt-2">
                       <ShoppingCart className="w-4 h-4"/> {resumenBackend.ventasRealizadas || 0} Ventas Realizadas
                    </div>
                  </div>
                  <div className="bg-blue-50 p-5 rounded-3xl group-hover:scale-110 transition-transform"><ShoppingBag className="text-blue-600 w-8 h-8"/></div>
               </div>
            </div>

            {/* FILA 3: Estado de Caja Física, Gráfico de Dona y Próximos */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-3 bg-[#F8FAFC] p-6 rounded-[2rem] border border-slate-100 flex flex-col justify-center items-center text-center shadow-inner">
                <h3 className="text-3xl font-black text-slate-800">S/ {cajaHoy.dineroEnCajaCalculado.toFixed(2)}</h3>
                <p className="text-xs font-bold text-slate-500 mb-6 uppercase">Caja Física (Hoy)</p>
                <div className="text-[10px] font-bold text-orange-500 mb-6 uppercase tracking-tighter bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100">
                    Por Cobrar Puerta: S/ {cajaHoy.porCobrarHoy.toFixed(2)}
                </div>
                
                <button 
                    onClick={() => navigate('/catalogo')} 
                    className="w-full bg-[#00C193] text-white py-4 rounded-[1.2rem] font-black text-xs uppercase tracking-widest transition-all duration-300 flex justify-center items-center gap-2 shadow-lg shadow-[#00C193]/30 hover:bg-[#00A880] hover:-translate-y-1 hover:shadow-xl hover:shadow-[#00C193]/40 active:scale-[0.98]"
                >
                    <Plus className="w-5 h-5 stroke-[3]" /> Nueva Reserva
                </button>
              </div>

              {/* Gráfico Circular de Estados CONECTADO AL BACKEND */}
              <div className="lg:col-span-4 bg-[#F8FAFC] p-6 rounded-[2rem] border border-slate-100">
                <h3 className="font-black text-slate-800 text-sm mb-4 uppercase tracking-tighter">Estado de Reservas (Filtro)</h3>
                <div className="flex items-center justify-center h-36 gap-6">
                   <div className="w-32 h-32">
                     <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                         <Pie data={pieDataBackend} innerRadius={35} outerRadius={55} dataKey="value" stroke="none">
                            {pieDataBackend.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                         </Pie>
                       </PieChart>
                     </ResponsiveContainer>
                   </div>
                   <div className="flex flex-col gap-3">
                      {pieDataBackend.map(item => (
                          <div key={item.name} className="flex items-center gap-2 text-xs font-medium">
                              <div className="w-3 h-3 rounded-md" style={{ backgroundColor: item.color }}></div>
                              <span className="font-bold text-slate-500 uppercase text-[10px]">{item.name}</span>
                              <span className="font-black text-slate-900 ml-2">{item.value}</span>
                          </div>
                      ))}
                   </div>
                </div>
              </div>

              {/* Próximos Partidos */}
              <div className="lg:col-span-5 bg-[#F8FAFC] p-6 rounded-[2rem] border border-slate-100 overflow-hidden">
                <h3 className="font-black text-slate-800 text-sm mb-4 uppercase tracking-tighter">Próximos Partidos (Hoy)</h3>
                <div className="space-y-3 max-h-[140px] overflow-y-auto custom-scrollbar pr-2">
                    {cajaHoy.proximasReservasList.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-6">
                        <Clock className="w-8 h-8 text-slate-200 mb-2" />
                        <p className="text-slate-400 text-xs italic">No hay más partidos hoy</p>
                      </div>
                    ) : (
                      cajaHoy.proximasReservasList.map(r => (
                        <div key={r.idReserva} className="bg-white p-3 rounded-2xl flex justify-between items-center shadow-sm border border-slate-50 hover:border-[#00C193] transition-all">
                            <div className="flex items-center gap-3">
                               <div className="bg-slate-50 p-2 rounded-xl text-slate-400"><User className="w-4 h-4"/></div>
                               <span className="font-black text-slate-700 text-xs">{r.cancha?.nombre || 'Campo'}</span>
                            </div>
                            <span className="text-[#00C193] font-black text-xs">{r.horaInicio.split('T')[1]?.substring(0, 5)} hrs</span>
                        </div>
                      ))
                    )}
                </div>
              </div>
            </div>

            {/* FILA 4: Gráficos de Barras Financieros y Ocupación */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm">
                <h3 className="font-black text-slate-900 mb-6 uppercase text-xs flex items-center gap-2 border-b border-slate-50 pb-4">
                   <TrendingUp className="text-[#00C193] w-4 h-4"/> Ingresos (Reservas vs Tienda)
                </h3>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.dataFinanzas}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94A3B8'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94A3B8'}} tickFormatter={v => `S/${v}`} />
                      <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)'}} />
                      <Legend iconType="circle" wrapperStyle={{fontSize: 10, fontWeight: 'bold', paddingTop: '10px'}}/>
                      <Bar dataKey="ingresosReservas" name="RESERVAS" stackId="a" fill="#00C193" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="ingresosTienda" name="TIENDA" stackId="a" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm">
                <h3 className="font-black text-slate-900 mb-6 uppercase text-xs flex items-center gap-2 border-b border-slate-50 pb-4">
                   <BarChart3 className="text-blue-500 w-4 h-4"/> Ocupación Detallada por Cancha
                </h3>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.dataOcupacion}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94A3B8'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94A3B8'}} />
                      <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)'}} />
                      <Legend iconType="circle" wrapperStyle={{fontSize: 10, fontWeight: 'bold', paddingTop: '10px'}}/>
                      {canchas.map((c, idx) => (
                        <Bar 
                          key={c.idCancha} 
                          dataKey={c.nombre} 
                          name={c.nombre.toUpperCase()} 
                          fill={COLORS_CAMPOS[idx % COLORS_CAMPOS.length]} 
                          radius={[6, 6, 0, 0]} 
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* FILA 5: Inteligencia de Ventas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-10">
               <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col h-full">
                  <h3 className="font-black text-slate-800 text-sm mb-8 uppercase tracking-widest flex items-center gap-3">
                     <Star className="text-yellow-500 fill-yellow-500 w-5 h-5"/> PRODUCTOS MÁS VENDIDOS
                  </h3>
                  <div className="space-y-7 flex-1 flex flex-col justify-center">
                    {stats.topProds.length === 0 ? (
                      <div className="text-center py-10">
                        <ShoppingBag className="w-12 h-12 text-slate-100 mx-auto mb-3" />
                        <p className="text-slate-400 text-xs italic">Sin ventas registradas en el periodo</p>
                      </div>
                    ) : (
                      stats.topProds.map((p, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-xs mb-3 font-black text-slate-700">
                             <span className="uppercase tracking-tighter">{p.nombre}</span>
                             <span className="bg-slate-100 px-3 py-1 rounded-full">{p.cantidad} UND.</span>
                          </div>
                          <div className="w-full h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100 shadow-inner">
                            <div 
                              className="h-full bg-gradient-to-r from-[#00C193] to-[#00A880] rounded-full transition-all duration-1000 ease-out" 
                              style={{ width: `${(p.cantidad / stats.topProds[0].cantidad) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
               </div>

               <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-center relative overflow-hidden">
                  <h3 className="font-black text-slate-800 text-sm mb-10 uppercase tracking-widest">Distribución de Ingresos</h3>
                  <div className="space-y-12 relative z-10">
                     <div>
                       <div className="flex justify-between text-xs mb-4 font-black text-slate-500 uppercase tracking-tighter">
                          <span>Reservas de Canchas</span>
                          <span className="text-[#00C193] text-sm">{pctReservas}%</span>
                       </div>
                       <div className="w-full h-5 bg-slate-50 rounded-full overflow-hidden border border-slate-100 shadow-inner p-1">
                          <div 
                             className="h-full bg-[#00C193] rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(0,193,147,0.3)]" 
                             style={{ width: `${pctReservas}%` }}
                          ></div>
                       </div>
                     </div>
                     <div>
                       <div className="flex justify-between text-xs mb-4 font-black text-slate-500 uppercase tracking-tighter">
                          <span>Ventas de Tienda / Extras</span>
                          <span className="text-blue-600 text-sm">{pctTienda}%</span>
                       </div>
                       <div className="w-full h-5 bg-slate-50 rounded-full overflow-hidden border border-slate-100 shadow-inner p-1">
                          <div 
                             className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(59,130,246,0.3)]" 
                             style={{ width: `${pctTienda}%` }}
                          ></div>
                       </div>
                     </div>
                  </div>
                  <div className="mt-14 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase border-t border-slate-50 pt-8">
                    <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#00C193] animate-pulse"></div> Base de datos en tiempo real</span>
                    <div onClick={() => navigate('/admin/reportes')} className="cursor-pointer hover:text-[#00C193] flex items-center gap-1 transition-colors">
                       VER REPORTES COMPLETOS <ArrowUpRight className="w-4 h-4"/>
                    </div>
                  </div>
               </div>
            </div>

          </div>
        </div>
      </main>

      {/* MODALES OPERATIVOS */}
      <AperturaCajaModal 
         isOpen={requiereApertura} 
         onSuccess={() => { setRequiereApertura(false); cargarDatosDashboard(); }} 
      />
      
      {turnoActivo && (
        <CerrarCajaModal 
          isOpen={isCerrarCajaOpen} 
          onClose={() => setIsCerrarCajaOpen(false)} 
          idTurno={turnoActivo.idTurno}
          montoCalculado={Number(turnoActivo?.montoInicial || 0) + cajaHoy.dineroEnCajaCalculado}
          onSuccess={() => { setIsCerrarCajaOpen(false); navigate('/login'); }}
        />
      )}
    </div>
  );
}