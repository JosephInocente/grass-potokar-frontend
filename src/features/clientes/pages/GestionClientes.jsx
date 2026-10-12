import React, { useEffect, useState, useContext, useMemo } from 'react';
import { SedeContext } from '../../../context/SedeContext';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Award, Star, Clock, Phone, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../../api/axiosConfig';
import Sidebar from '../../../components/Sidebar';

export default function GestionClientes() {
  const [clientes, setClientes] = useState([]);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [orden, setOrden] = useState({ campo: 'partidosJugados', direccion: 'desc' });
  const [cargando, setCargando] = useState(true);
  
  // ESTADOS PARA LA PAGINACIÓN
  const [paginaActual, setPaginaActual] = useState(1);
  const clientesPorPagina = 10;
  
  const { sedeActiva } = useContext(SedeContext);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const rol = localStorage.getItem('rol');

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    if (rol !== 'ADMIN' && rol !== 'SUPER_ADMIN') { navigate('/catalogo'); return; }
    cargarDatos();
    // eslint-disable-next-line
  }, [token, rol, navigate, sedeActiva]);

  // Si el usuario escribe en el buscador, regresamos a la página 1
  useEffect(() => {
    setPaginaActual(1);
  }, [filtroTexto, orden]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const res = await api.get('/reservas/fidelizacion', {
        headers: { 'X-Sede-Activa': sedeActiva || 'GLOBAL' }
      });
      setClientes(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Error al cargar clientes:", error);
      setClientes([]);
    } finally {
      setCargando(false);
    }
  };

  const obtenerNivelCliente = (partidosJugados) => {
    if (partidosJugados >= 10) return { texto: 'Cliente VIP', clase: 'bg-yellow-100 text-yellow-700 border-yellow-200', icono: <Award className="w-3.5 h-3.5" /> };
    if (partidosJugados >= 4) return { texto: 'Frecuente', clase: 'bg-blue-100 text-blue-700 border-blue-200', icono: <Star className="w-3.5 h-3.5" /> };
    return { texto: 'Ocasional', clase: 'bg-slate-100 text-slate-600 border-slate-200', icono: <Clock className="w-3.5 h-3.5" /> };
  };

  const cambiarOrden = (campo) => {
    setOrden(prev => ({
      campo,
      direccion: prev.campo === campo && prev.direccion === 'desc' ? 'asc' : 'desc'
    }));
  };

  // Filtrado y ordenamiento en memoria
  const clientesProcesados = useMemo(() => {
    let filtrados = clientes.filter(c => 
      // CORRECCIÓN: Leemos c.nombre en lugar de c.cliente
      c.nombre?.toLowerCase().includes(filtroTexto.toLowerCase()) || 
      c.telefono?.toLowerCase().includes(filtroTexto.toLowerCase())
    );

    return filtrados.sort((a, b) => {
      let valorA = a[orden.campo] || 0;
      let valorB = b[orden.campo] || 0;

      if (typeof valorA === 'string') valorA = valorA.toLowerCase();
      if (typeof valorB === 'string') valorB = valorB.toLowerCase();

      if (valorA < valorB) return orden.direccion === 'asc' ? -1 : 1;
      if (valorA > valorB) return orden.direccion === 'asc' ? 1 : -1;
      return 0;
    });
  }, [clientes, filtroTexto, orden]);

  // CÁLCULOS DE PAGINACIÓN
  const totalPaginas = Math.ceil(clientesProcesados.length / clientesPorPagina);
  const indiceUltimoCliente = paginaActual * clientesPorPagina;
  const indicePrimerCliente = indiceUltimoCliente - clientesPorPagina;
  const clientesPaginados = clientesProcesados.slice(indicePrimerCliente, indiceUltimoCliente);

  const irPaginaAnterior = () => setPaginaActual(prev => Math.max(prev - 1, 1));
  const irPaginaSiguiente = () => setPaginaActual(prev => Math.min(prev + 1, totalPaginas));

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative p-4 md:p-8">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 gap-4 shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-[#E6F7F4] p-3 rounded-xl shadow-sm">
              <Users className="text-[#00C193] w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800">Fidelización de Clientes</h1>
              <p className="text-sm text-slate-500 font-medium mt-1">Identifica a los jugadores reales y su historial de reservas</p>
            </div>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o teléfono..." 
              className="w-full pl-10 pr-4 py-3 bg-[#F8FAFC] border border-slate-200 rounded-xl focus:border-[#00C193] focus:ring-1 focus:ring-[#00C193] outline-none font-bold text-slate-700 text-sm transition-all"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
            />
          </div>
        </header>

        {/* CONTENEDOR PRINCIPAL TABLA + PAGINACIÓN */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 flex flex-col flex-1 min-h-0 overflow-hidden">
          
          {/* ÁREA SCROLLABLE DE LA TABLA */}
          <div className="overflow-auto flex-1 custom-scrollbar">
            <table className="w-full text-left border-collapse relative">
              <thead className="sticky top-0 z-10 bg-slate-50 outline outline-1 outline-slate-100 shadow-sm cursor-pointer">
                <tr className="text-slate-400 font-black uppercase text-[10px] tracking-widest select-none">
                  {/* CORRECCIÓN: Ordenamos por 'nombre' */}
                  <th className="p-5 pl-8 hover:bg-slate-100 transition-colors" onClick={() => cambiarOrden('nombre')}>
                    <div className="flex items-center gap-2">Cliente <ArrowUpDown className="w-3 h-3" /></div>
                  </th>
                  <th className="p-5 text-center hover:bg-slate-100 transition-colors" onClick={() => cambiarOrden('partidosJugados')}>
                    <div className="flex items-center justify-center gap-2">Partidos Jugados <ArrowUpDown className="w-3 h-3" /></div>
                  </th>
                  <th className="p-5 hover:bg-slate-100 transition-colors" onClick={() => cambiarOrden('dineroGenerado')}>
                    <div className="flex items-center gap-2">Dinero Generado <ArrowUpDown className="w-3 h-3" /></div>
                  </th>
                  <th className="p-5 hover:bg-slate-100 transition-colors" onClick={() => cambiarOrden('ultimaVisita')}>
                    <div className="flex items-center gap-2">Última Visita <ArrowUpDown className="w-3 h-3" /></div>
                  </th>
                  <th className="p-5 pr-8">Nivel / Fidelidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cargando ? (
                  <tr>
                    <td colSpan="5" className="p-12 text-center text-slate-400 font-medium">Cargando métricas de clientes...</td>
                  </tr>
                ) : clientesPaginados.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-12 text-center text-slate-400 font-medium">No se encontraron clientes que coincidan con la búsqueda.</td>
                  </tr>
                ) : (
                  clientesPaginados.map((cliente) => {
                    const nivel = obtenerNivelCliente(cliente.partidosJugados);
                    
                    const fechaUltima = cliente.ultimaVisita 
                      ? new Date(cliente.ultimaVisita).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
                      : 'Desconocida';

                    return (
                      <tr key={cliente.idUsuario} className="hover:bg-slate-50 transition-colors group">
                        <td className="p-5 pl-8">
                          {/* CORRECCIÓN: Mostramos cliente.nombre en la UI */}
                          <p className="font-bold text-slate-800 text-base capitalize">{cliente.nombre || 'Desconocido'}</p>
                          <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-1">
                            <Phone className="w-3.5 h-3.5 text-slate-400" /> {cliente.telefono && cliente.telefono !== 'sin-telefono' ? cliente.telefono : 'Sin teléfono registrado'}
                          </p>
                        </td>
                        <td className="p-5 text-center">
                          <span className="font-black text-xl text-slate-700">{cliente.partidosJugados}</span>
                        </td>
                        <td className="p-5">
                          <span className="font-black text-[#00C193] text-lg">S/ {Number(cliente.dineroGenerado).toFixed(2)}</span>
                        </td>
                        <td className="p-5">
                          <p className="font-bold text-slate-600 text-sm">{fechaUltima}</p>
                        </td>
                        <td className="p-5 pr-8">
                          <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 w-fit border ${nivel.clase}`}>
                            {nivel.icono} {nivel.texto}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* CONTROLES DE PAGINACIÓN */}
          {!cargando && clientesProcesados.length > 0 && (
            <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-between px-8 shrink-0">
              <p className="text-sm font-medium text-slate-500">
                Mostrando <span className="font-bold text-slate-700">{indicePrimerCliente + 1}</span> a <span className="font-bold text-slate-700">{Math.min(indiceUltimoCliente, clientesProcesados.length)}</span> de <span className="font-bold text-slate-700">{clientesProcesados.length}</span> clientes
              </p>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={irPaginaAnterior} 
                  disabled={paginaActual === 1}
                  className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold text-slate-700 px-3">{paginaActual}</span>
                  <span className="text-sm font-medium text-slate-400">/</span>
                  <span className="text-sm font-medium text-slate-500 px-3">{totalPaginas}</span>
                </div>

                <button 
                  onClick={irPaginaSiguiente} 
                  disabled={paginaActual === totalPaginas}
                  className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}