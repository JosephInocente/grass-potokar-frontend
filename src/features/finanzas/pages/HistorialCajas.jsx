import React, { useEffect, useState, useContext } from 'react';
import { 
  History, DollarSign, User, Store, Clock, 
  AlertTriangle, CheckCircle, Download, Calendar,
  ChevronLeft, ChevronRight, Search, FileText, TrendingUp
} from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';

import api from '../../../api/axiosConfig';
import Sidebar from '../../../components/Sidebar';
import { SedeContext } from '../../../context/SedeContext';

export default function HistorialCajas() {
  const [turnos, setTurnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  
  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const elementosPorPagina = 8;

  const { sedeActiva } = useContext(SedeContext);
  const rol = localStorage.getItem('rol');

  useEffect(() => {
    cargarHistorial();
    // eslint-disable-next-line
  }, [sedeActiva]);

  const cargarHistorial = async () => {
    setLoading(true);
    try {
      const res = await api.get('/turnos');
      // Ordenamos por fecha de apertura (más reciente primero)
      const dataOrdenada = res.data.sort((a, b) => new Date(b.fechaApertura) - new Date(a.fechaApertura));
      setTurnos(dataOrdenada);
    } catch (error) {
      console.error("Error cargando historial de cajas", error);
    } finally {
      setLoading(false);
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return '---';
    return new Date(fecha).toLocaleString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(0, 193, 147);
    doc.text("Reporte de Auditoría de Cajas", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 28);

    const tableData = turnosFiltrados.map(t => [
      formatearFecha(t.fechaApertura),
      t.nombreUsuario,
      t.nombreCaja,
      `S/ ${t.montoInicial.toFixed(2)}`,
      `S/ ${t.montoCalculado.toFixed(2)}`,
      t.montoReal ? `S/ ${t.montoReal.toFixed(2)}` : 'Pendiente',
      t.estado
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['Apertura', 'Cajero', 'Caja', 'Inicial', 'Sistema', 'Real', 'Estado']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [0, 193, 147] }
    });

    doc.save(`Auditoria_Cajas_${new Date().getTime()}.pdf`);
  };

  // Filtrado por búsqueda (Cajero o Caja)
  const turnosFiltrados = turnos.filter(t => 
    t.nombreUsuario.toLowerCase().includes(busqueda.toLowerCase()) ||
    t.nombreCaja.toLowerCase().includes(busqueda.toLowerCase())
  );

  // Cálculos de Resumen
  const totalRecaudado = turnosFiltrados
    .filter(t => t.estado === 'CERRADO')
    .reduce((acc, curr) => acc + (curr.montoReal || 0), 0);

  const turnosAbiertos = turnosFiltrados.filter(t => t.estado === 'ABIERTO').length;

  // Lógica de Paginación
  const totalPaginas = Math.ceil(turnosFiltrados.length / elementosPorPagina);
  const indiceUltimo = paginaActual * elementosPorPagina;
  const indicePrimer = indiceUltimo - elementosPorPagina;
  const turnosPaginados = turnosFiltrados.slice(indicePrimer, indiceUltimo);

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative p-4 md:p-8">
        
        {/* HEADER */}
        <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-100 p-3 rounded-xl">
              <History className="text-[#00C193] w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800">Auditoría de Cajas</h1>
              <p className="text-sm text-slate-500 font-medium">Control de aperturas, cierres y flujo de efectivo</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar cajero o caja..." 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#00C193] outline-none font-bold text-sm"
                value={busqueda}
                onChange={(e) => { setBusqueda(e.target.value); setPaginaActual(1); }}
              />
            </div>
            <button 
              onClick={exportarPDF}
              className="bg-slate-800 text-white font-bold py-2.5 px-6 rounded-xl hover:bg-slate-900 transition-all flex items-center gap-2 justify-center shadow-lg"
            >
              <Download className="w-4 h-4" /> Reporte PDF
            </button>
          </div>
        </header>

        {/* RESUMEN CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
              <TrendingUp className="text-emerald-500 w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Recaudación Total</p>
              <p className="text-xl font-black text-slate-800">S/ {totalRecaudado.toFixed(2)}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
              <Store className="text-blue-500 w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Turnos Abiertos</p>
              <p className="text-xl font-black text-slate-800">{turnosAbiertos} Cajeros</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center">
              <Calendar className="text-purple-500 w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Sede Actual</p>
              <p className="text-xl font-black text-slate-800 capitalize">{sedeActiva === 'GLOBAL' ? 'Corporativo' : 'Filial Seleccionada'}</p>
            </div>
          </div>
        </div>

        {/* TABLA DE HISTORIAL */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col flex-1">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="p-5 pl-8">Apertura / Cierre</th>
                  <th className="p-5">Responsable</th>
                  <th className="p-5">Caja</th>
                  <th className="p-5 text-right">Monto Inicial</th>
                  <th className="p-5 text-right">Ventas App</th>
                  <th className="p-5 text-right">Efectivo Real</th>
                  <th className="p-5 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan="7" className="p-20 text-center text-slate-400 font-bold">Cargando historial...</td></tr>
                ) : turnosFiltrados.length === 0 ? (
                  <tr><td colSpan="7" className="p-20 text-center text-slate-400 font-bold">No se encontraron registros de caja.</td></tr>
                ) : (
                  turnosPaginados.map(t => {
                    const tieneDiferencia = t.montoReal !== null && t.montoReal !== t.montoCalculado;
                    return (
                      <tr key={t.idTurno} className="hover:bg-slate-50 transition-colors group">
                        <td className="p-5 pl-8">
                          <div className="flex flex-col gap-1">
                            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                              <div className="w-2 h-2 rounded-full bg-emerald-500"></div> {formatearFecha(t.fechaApertura)}
                            </span>
                            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                              <div className="w-2 h-2 rounded-full bg-slate-300"></div> {formatearFecha(t.fechaCierre)}
                            </span>
                          </div>
                        </td>
                        <td className="p-5">
                          <div className="flex items-center gap-2">
                            <div className="bg-blue-50 p-2 rounded-lg"><User className="w-4 h-4 text-blue-500" /></div>
                            <span className="font-bold text-slate-700 text-sm">{t.nombreUsuario}</span>
                          </div>
                        </td>
                        <td className="p-5">
                          <span className="font-bold text-slate-500 text-xs">{t.nombreCaja}</span>
                        </td>
                        <td className="p-5 text-right font-bold text-slate-600 text-sm">S/ {t.montoInicial.toFixed(2)}</td>
                        <td className="p-5 text-right font-bold text-slate-600 text-sm">S/ {t.montoCalculado.toFixed(2)}</td>
                        <td className="p-5 text-right">
                          {t.montoReal !== null ? (
                            <div className="flex flex-col items-end">
                              <span className="font-black text-slate-800 text-sm">S/ {t.montoReal.toFixed(2)}</span>
                              {tieneDiferencia && (
                                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded mt-1 ${t.diferencia < 0 ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                                  Dif: S/ {t.diferencia.toFixed(2)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs italic text-slate-300">En curso...</span>
                          )}
                        </td>
                        <td className="p-5 text-center">
                          <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                            t.estado === 'ABIERTO' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {t.estado === 'ABIERTO' ? <Clock className="w-3 h-3"/> : <CheckCircle className="w-3 h-3"/>}
                            {t.estado}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINACIÓN */}
          <div className="p-6 bg-white border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm font-medium text-slate-500">
              Página <span className="font-black text-slate-800">{paginaActual}</span> de <span className="font-black text-slate-800">{totalPaginas || 1}</span>
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => setPaginaActual(prev => Math.max(prev - 1, 1))}
                disabled={paginaActual === 1}
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 disabled:opacity-40 transition-all"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
              <button 
                onClick={() => setPaginaActual(prev => Math.min(prev + 1, totalPaginas))}
                disabled={paginaActual === totalPaginas || totalPaginas === 0}
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 disabled:opacity-40 transition-all"
              >
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}