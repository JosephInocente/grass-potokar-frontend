import React, { useEffect, useState, useContext, useMemo } from 'react';
import { SedeContext } from '../../../context/SedeContext';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, TrendingUp, DollarSign, 
  ShoppingCart, CalendarDays, Star, ArrowUpRight, Filter, Download, ChevronDown, FileSpreadsheet, CheckCircle2
} from 'lucide-react';
import api from '../../../api/axiosConfig';

import Sidebar from '../../../components/Sidebar';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';

export default function GestionReportes() {
  const [reservas, setReservas] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [periodo, setPeriodo] = useState('MES'); 
  const [sedes, setSedes] = useState([]); 
  const [menuExportar, setMenuExportar] = useState(false); 
  
  const { sedeActiva } = useContext(SedeContext);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const rol = localStorage.getItem('rol'); 
  const idSede = localStorage.getItem('idSede');

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    if (rol !== 'ADMIN' && rol !== 'SUPER_ADMIN') { navigate('/catalogo'); return; }
    
    if (rol === 'SUPER_ADMIN') {
      api.get('/sedes')
        .then(res => setSedes(res.data))
        .catch(err => console.error("Error cargando sedes", err));
    }
  }, [token, rol, navigate]);

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line
  }, [sedeActiva]); 

  const cargarDatos = async () => {
    try {
      const idSedeAUsar = rol === 'SUPER_ADMIN' ? (sedeActiva || 'GLOBAL') : idSede;
      const configHeader = { headers: { 'X-Sede-Activa': idSedeAUsar } };
      
      const [resRes, resVen] = await Promise.all([
        api.get('/reservas', configHeader),
        api.get('/ventas', configHeader)
      ]);

      const estadosValidos = ['Confirmada', 'Confirmado', 'En Curso', 'Finalizada', 'Pagada'];
      
      let reservasValidas = Array.isArray(resRes.data) 
        ? resRes.data.filter(r => estadosValidos.includes(r.estado) || r.estado !== 'Cancelada')
        : [];
        
      let ventasFiltradas = Array.isArray(resVen.data) ? resVen.data : []; 

      setReservas(reservasValidas);
      setVentas(ventasFiltradas); 
    } catch (error) {
      console.error("Error cargando reportes", error);
      setReservas([]);
      setVentas([]);
    }
  };

  const filtrarPorPeriodo = (item, campoFecha) => {
    if (periodo === 'TODO') return true;
    if (!item[campoFecha]) return false;

    let str = String(item[campoFecha]).replace(' ', 'T');
    if (str.length === 10) str += 'T12:00:00'; 
    
    const fechaItem = new Date(str);
    if (isNaN(fechaItem.getTime())) return false;

    const hoy = new Date();

    if (periodo === 'HOY') {
      return fechaItem.toDateString() === hoy.toDateString();
    }
    if (periodo === 'SEMANA') {
      const diaSemana = hoy.getDay();
      const diffToMonday = hoy.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1);
      const lunes = new Date(hoy); lunes.setDate(diffToMonday); lunes.setHours(0,0,0,0);
      const domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6); domingo.setHours(23,59,59,999);
      return fechaItem >= lunes && fechaItem <= domingo;
    }
    if (periodo === 'MES') {
      return fechaItem.getMonth() === hoy.getMonth() && fechaItem.getFullYear() === hoy.getFullYear();
    }
    if (periodo === 'AÑO') {
      return fechaItem.getFullYear() === hoy.getFullYear();
    }
    return true;
  };

  const reservasFiltradas = useMemo(() => reservas.filter(r => filtrarPorPeriodo(r, 'horaInicio')), [reservas, periodo]);
  const ventasFiltradas = useMemo(() => ventas.filter(v => filtrarPorPeriodo(v, 'fechaVenta') && v.estado !== 'Anulada' && v.estado !== 'Cancelada'), [ventas, periodo]);

  const totalReservas = useMemo(() => reservasFiltradas.reduce((sum, r) => sum + (Number(r.total) || 0), 0), [reservasFiltradas]);
  const totalVentas = useMemo(() => ventasFiltradas.reduce((sum, v) => sum + (Number(v.total || v.montoTotal || v.monto) || 0), 0), [ventasFiltradas]);
  const granTotal = totalReservas + totalVentas;

  const conteoProductos = useMemo(() => {
    const map = {};
    ventasFiltradas.forEach(v => {
      if (v.detalles) {
        v.detalles.forEach(det => {
          const nombre = det.nombreProducto || det.producto?.nombre || 'Producto';
          map[nombre] = (map[nombre] || 0) + det.cantidad;
        });
      }
    });
    return Object.entries(map)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);
  }, [ventasFiltradas]);

  const descargarExcel = async (tipo) => {
    try {
      const idSedeAUsar = rol === 'SUPER_ADMIN' ? (sedeActiva || 'GLOBAL') : idSede;
      const payload = {
        reservas: tipo === 'RESERVAS' || tipo === 'AMBOS' ? reservasFiltradas : [],
        ventas: tipo === 'TIENDA' || tipo === 'AMBOS' ? ventasFiltradas : []
      };
      const response = await api.post(`/reportes/exportar/excel?tipo=${tipo}`, payload, {
        headers: { 'X-Sede-Activa': idSedeAUsar },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Reporte_${tipo}_${periodo}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setMenuExportar(false);
    } catch (error) {
      console.error("Error Excel", error);
      alert("Error al generar Excel");
    }
  };

  const exportarReportePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setTextColor(0, 193, 147);
    let nombreSedeImprimir = (sedeActiva === 'GLOBAL' || !sedeActiva) ? 'Vista Global' : 'Sede Seleccionada';
    doc.text(`Reporte de Cuadre - ${nombreSedeImprimir}`, 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Periodo: ${periodo} | Generado: ${new Date().toLocaleString()}`, 14, 28);

    autoTable(doc, {
      startY: 35,
      head: [['Concepto', 'Operaciones', 'Subtotal']],
      body: [
        ['Reservas de Canchas', reservasFiltradas.length.toString(), `S/ ${totalReservas.toFixed(2)}`],
        ['Ventas de Tienda', ventasFiltradas.length.toString(), `S/ ${totalVentas.toFixed(2)}`],
        ['TOTAL GENERAL', '', `S/ ${granTotal.toFixed(2)}`]
      ],
      headStyles: { fillColor: [0, 193, 147] }
    });
    doc.save(`Cuadre_${periodo}.pdf`);
  };

  return (
    <div className="flex h-screen bg-[#F4F6F8] font-sans overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative p-4 md:p-6 lg:p-8">

        {/* CONTENEDOR ENCAPSULADO BLANCO */}
        <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(8,_112,_184,_0.04)] border border-slate-100 min-h-full mx-auto w-full flex flex-col overflow-hidden">
          
          <header className="p-6 md:p-8 border-b border-slate-50 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="bg-[#EAF9F1] p-4 rounded-[1.2rem] border border-[#00C193]/20">
                <BarChart3 className="text-[#00C193] w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Centro de Auditoría</h1>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Análisis Contable y Exportación de Datos</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
               {/* Selector Neumórfico */}
               <div className="relative flex items-center">
                  <div className="absolute left-4 pointer-events-none">
                    <Filter className="w-4 h-4 text-slate-400" />
                  </div>
                  <select 
                    className="bg-[#F4F6F8] border-2 border-transparent outline-none font-black text-slate-700 text-xs cursor-pointer pl-11 pr-8 py-3.5 rounded-[1.2rem] focus:bg-white focus:border-[#00C193] focus:ring-4 focus:ring-[#00C193]/10 transition-all appearance-none" 
                    value={periodo} 
                    onChange={(e) => setPeriodo(e.target.value)}
                  >
                    <option value="HOY">Solo Hoy</option>
                    <option value="SEMANA">Esta Semana</option>
                    <option value="MES">Este Mes</option>
                    <option value="AÑO">Este Año</option>
                    <option value="TODO">Histórico Completo</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 pointer-events-none" />
               </div>
               
               {/* Menú de Exportación Premium */}
               <div className="relative">
                 <button 
                   onClick={() => setMenuExportar(!menuExportar)} 
                   className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3.5 rounded-[1.2rem] text-xs font-black hover:bg-slate-800 active:scale-[0.98] transition-all shadow-lg shadow-slate-900/20"
                 >
                   <Download className="w-4 h-4" /> Exportar Data <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${menuExportar ? 'rotate-180' : ''}`} />
                 </button>

                 {menuExportar && (
                   <div className="absolute right-0 mt-3 w-64 bg-white/90 backdrop-blur-md rounded-[1.5rem] shadow-[0_20px_50px_rgba(8,_112,_184,_0.1)] border border-slate-100 p-2 z-50 flex flex-col gap-1 overflow-hidden animate-in fade-in slide-in-from-top-2">
                     <button onClick={() => { exportarReportePDF(); setMenuExportar(false); }} className="flex items-center gap-3 w-full text-left px-4 py-3.5 hover:bg-[#00C193]/10 text-slate-700 font-bold rounded-2xl transition-colors text-xs group">
                       <Download className="w-4 h-4 text-[#00C193] group-hover:scale-110 transition-transform" /> 
                       <span>Reporte de Cuadre <span className="text-[9px] text-slate-400 block uppercase">Documento PDF</span></span>
                     </button>
                     <div className="h-px bg-slate-100 my-1 mx-3"></div>
                     <button onClick={() => descargarExcel('RESERVAS')} className="flex items-center gap-3 w-full text-left px-4 py-3.5 hover:bg-green-50 text-slate-700 font-bold rounded-2xl transition-colors text-xs group">
                       <FileSpreadsheet className="w-4 h-4 text-green-600 group-hover:scale-110 transition-transform" /> 
                       <span>Data de Reservas <span className="text-[9px] text-slate-400 block uppercase">Archivo Excel</span></span>
                     </button>
                     <button onClick={() => descargarExcel('TIENDA')} className="flex items-center gap-3 w-full text-left px-4 py-3.5 hover:bg-blue-50 text-slate-700 font-bold rounded-2xl transition-colors text-xs group">
                       <FileSpreadsheet className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" /> 
                       <span>Data de Tienda <span className="text-[9px] text-slate-400 block uppercase">Archivo Excel</span></span>
                     </button>
                     <button onClick={() => descargarExcel('AMBOS')} className="flex items-center gap-3 w-full text-left px-4 py-3.5 hover:bg-orange-50 text-slate-700 font-bold rounded-2xl transition-colors text-xs group">
                       <FileSpreadsheet className="w-4 h-4 text-orange-600 group-hover:scale-110 transition-transform" /> 
                       <span>Exportación Completa <span className="text-[9px] text-slate-400 block uppercase">Ambos módulos</span></span>
                     </button>
                   </div>
                 )}
               </div>
            </div>
          </header>

          <div className="p-6 md:p-8 w-full flex-1 space-y-8">
            
            {/* TARJETAS KPI DE RECAUDACIÓN (ESTILO DASHBOARD) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#F4F6F8] p-7 rounded-[2rem] border border-slate-100 relative overflow-hidden group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Recaudado</p>
                <h3 className="text-4xl font-black text-slate-900">S/ {granTotal.toFixed(2)}</h3>
                <div className="flex items-center gap-2 text-[#00C193] font-black text-xs mt-4 bg-white/60 w-max px-3 py-1.5 rounded-full">
                  <TrendingUp className="w-4 h-4" /> <span>Ingresos Consolidados</span>
                </div>
                <DollarSign className="absolute -right-4 -bottom-4 w-32 h-32 text-slate-900/[0.03] rotate-12 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500" />
              </div>

              <div className="bg-[#F4F6F8] p-7 rounded-[2rem] border border-slate-100 hover:shadow-lg hover:border-[#00C193]/30 transition-all duration-300 hover:-translate-y-1">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Por Reservas</p>
                <h3 className="text-3xl font-black text-[#00C193]">S/ {totalReservas.toFixed(2)}</h3>
                <p className="text-slate-500 text-xs font-bold mt-4 flex items-center gap-2">
                  <div className="bg-[#00C193]/10 p-1.5 rounded-lg"><CalendarDays className="w-4 h-4 text-[#00C193]" /></div>
                  {reservasFiltradas.length} Partidos cobrados
                </p>
              </div>

              <div className="bg-[#F4F6F8] p-7 rounded-[2rem] border border-slate-100 hover:shadow-lg hover:border-blue-500/30 transition-all duration-300 hover:-translate-y-1">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Por Tienda / Extras</p>
                <h3 className="text-3xl font-black text-blue-600">S/ {totalVentas.toFixed(2)}</h3>
                <p className="text-slate-500 text-xs font-bold mt-4 flex items-center gap-2">
                  <div className="bg-blue-500/10 p-1.5 rounded-lg"><ShoppingCart className="w-4 h-4 text-blue-600" /></div>
                  {ventasFiltradas.length} Ventas realizadas
                </p>
              </div>
            </div>

            {/* SECCIÓN DE INTELIGENCIA DE VENTAS Y DISTRIBUCIÓN */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-4">
              
              {/* Lo más vendido */}
              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-[0_10px_30px_rgba(0,0,0,0.02)]">
                <h3 className="text-[13px] font-black text-slate-800 mb-8 flex items-center gap-3 uppercase tracking-widest border-b border-slate-50 pb-4">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" /> LO MÁS VENDIDO (TOP 5)
                </h3>
                <div className="space-y-6">
                  {conteoProductos.length === 0 ? (
                    <p className="text-slate-400 font-medium text-center py-10 text-xs italic">No hay ventas registradas en este periodo.</p>
                  ) : (
                    conteoProductos.map((prod, i) => (
                      <div key={i} className="group">
                        <div className="flex justify-between items-end mb-2">
                          <span className="font-bold text-slate-700 capitalize text-sm group-hover:text-[#00C193] transition-colors">{prod.nombre}</span>
                          <span className="font-black text-slate-900 bg-slate-50 px-2.5 py-1 rounded-lg text-xs">{prod.cantidad} und.</span>
                        </div>
                        <div className="w-full h-3 bg-[#F4F6F8] rounded-full overflow-hidden shadow-inner">
                          <div 
                            className="h-full bg-gradient-to-r from-[#00C193] to-[#00A880] rounded-full transition-all duration-1000 ease-out" 
                            style={{ width: `${(prod.cantidad / conteoProductos[0].cantidad) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Distribución de Ingresos */}
              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-[0_10px_30px_rgba(0,0,0,0.02)] flex flex-col justify-center">
                <h3 className="text-[13px] font-black text-slate-800 mb-10 uppercase tracking-widest flex items-center gap-3 border-b border-slate-50 pb-4">
                  <BarChart3 className="w-5 h-5 text-[#00C193]" /> DISTRIBUCIÓN DEL INGRESO
                </h3>
                <div className="space-y-10">
                  <div>
                    <div className="flex justify-between mb-3 font-black text-xs text-slate-500 uppercase tracking-tight">
                      <span className="flex items-center gap-2"><div className="w-2 h-2 bg-[#00C193] rounded-full"></div> Reservas de Canchas</span>
                      <span className="text-slate-800 text-sm">{((totalReservas / (granTotal || 1)) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-5 bg-[#F4F6F8] rounded-full overflow-hidden shadow-inner p-1">
                      <div 
                        className="h-full bg-[#00C193] rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,193,147,0.3)]" 
                        style={{ width: `${(totalReservas / (granTotal || 1)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-3 font-black text-xs text-slate-500 uppercase tracking-tight">
                      <span className="flex items-center gap-2"><div className="w-2 h-2 bg-blue-500 rounded-full"></div> Ventas de Tienda / Extras</span>
                      <span className="text-slate-800 text-sm">{((totalVentas / (granTotal || 1)) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-5 bg-[#F4F6F8] rounded-full overflow-hidden shadow-inner p-1">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(59,130,246,0.3)]" 
                        style={{ width: `${(totalVentas / (granTotal || 1)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                <div className="mt-10 pt-6 border-t border-slate-50 flex justify-between items-center">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-[#00C193]"/> Datos listos para contabilidad
                  </p>
                  <ArrowUpRight className="w-5 h-5 text-slate-300" />
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}