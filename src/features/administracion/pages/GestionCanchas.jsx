import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, MapPin, Maximize, Target, X, UploadCloud, Image as ImageIcon, 
  Edit2, Trash2, Sun, Moon, Activity, CheckCircle, AlertCircle, AlertTriangle, Building2, Trophy 
} from 'lucide-react';

// 1. Importamos la instancia configurada de axios
import api from '../../../api/axiosConfig';

import Sidebar from '../../../components/Sidebar';
import { SedeContext } from '../../../context/SedeContext';

export default function GestionCanchas() {
  const [canchas, setCanchas] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [sedes, setSedes] = useState([]); 
  
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [canchaToDelete, setCanchaToDelete] = useState(null);
  
  const [mensajeFlotante, setMensajeFlotante] = useState({ visible: false, texto: '', tipo: 'success' });
  
  const [nuevaCancha, setNuevaCancha] = useState({
    nombre: '', deporte: 'Fútbol', tipoGrass: 'Sintético', medidas: '', 
    precioDia: '', precioNoche: '', estado: 'Disponible', idSede: '' 
  });

  const [imagenFile, setImagenFile] = useState(null);
  const [imagenPreview, setImagenPreview] = useState(null);

  const navigate = useNavigate();
  
  const token = localStorage.getItem('token');
  const rol = localStorage.getItem('rol');
  const idSedeGuardada = localStorage.getItem('idSede'); 

  const { sedeActiva } = useContext(SedeContext);

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    if (rol !== 'ADMIN' && rol !== 'SUPER_ADMIN') { navigate('/catalogo'); return; }
    
    cargarDatos();
    
    const intervalo = setInterval(() => {
        setCanchas(prev => [...prev]); 
    }, 60000); 
    return () => clearInterval(intervalo);
    // eslint-disable-next-line
  }, [token, rol, navigate, sedeActiva]);

  const cargarDatos = async () => {
    try {
      const [resCanchas, resReservas] = await Promise.all([
        api.get('/canchas'),
        api.get('/reservas')
      ]);
      
      if (rol === 'SUPER_ADMIN') {
        const resSedes = await api.get('/sedes');
        setSedes(resSedes.data);
      }
      
      let canchasFiltradas = resCanchas.data;

      if (rol === 'SUPER_ADMIN' && sedeActiva !== 'GLOBAL') {
        canchasFiltradas = resCanchas.data.filter(c => c.sede && String(c.sede.idSede) === String(sedeActiva));
      } else if (rol === 'ADMIN') {
        canchasFiltradas = resCanchas.data.filter(c => c.sede && String(c.sede.idSede) === String(idSedeGuardada));
      }
      
      setCanchas(canchasFiltradas);
      setReservas(resReservas.data);
    } catch (error) { 
        console.error(error); 
    }
  };

  const mostrarMensaje = (texto, tipo = 'success') => {
    setMensajeFlotante({ visible: true, texto, tipo });
    setTimeout(() => {
      setMensajeFlotante(prev => ({ ...prev, visible: false }));
    }, 3500);
  };

  const handleImagenChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImagenFile(file);
      setImagenPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoverImagen = () => {
    setImagenFile(null);
    setImagenPreview(null);
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    
    const sedeFinal = rol === 'SUPER_ADMIN' ? nuevaCancha.idSede : idSedeGuardada;

    const payloadCancha = { 
        ...nuevaCancha, 
        sede: sedeFinal && sedeFinal !== 'null' ? { idSede: parseInt(sedeFinal) } : null 
    };

    const formData = new FormData();
    formData.append('cancha', new Blob([JSON.stringify(payloadCancha)], { type: 'application/json' }));
    if (imagenFile) {
        formData.append('imagen', imagenFile);
    }

    // 🟢 NUEVO: Configuración para enviar archivos
    const configUpload = {
      headers: { 'Content-Type': 'multipart/form-data' }
    };

    try {
      if (editMode) {
        // 🟢 Se añade la configuración al post
        await api.post(`/canchas/${selectedId}`, formData, configUpload);
        mostrarMensaje('Cancha actualizada correctamente'); 
      } else {
        // 🟢 Se añade la configuración al post
        await api.post('/canchas', formData, configUpload);
        mostrarMensaje('¡Cancha registrada con éxito!'); 
      }
      cerrarYLimpiarModal();
      cargarDatos();
    } catch (error) { 
        console.error("Detalle del error:", error.response?.data || error); 
        mostrarMensaje('Error al guardar. Verifica los datos.', 'error'); 
    }
  };

  const prepararEliminacion = (id) => {
    setCanchaToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmarEliminacion = async () => {
    if (!canchaToDelete) return;
    try {
      await api.delete(`/canchas/${canchaToDelete}`);
      cargarDatos();
      mostrarMensaje('Cancha eliminada del sistema', 'success');
    } catch (error) { 
      mostrarMensaje(error.response?.data?.message || 'Error al eliminar. Puede tener reservas asociadas.', 'error'); 
    } finally {
      setShowDeleteModal(false);
      setCanchaToDelete(null);
    }
  };

  const prepararEdicion = (cancha) => {
    setEditMode(true);
    setSelectedId(cancha.idCancha);
    setNuevaCancha({
      nombre: cancha.nombre, 
      deporte: cancha.deporte || 'Fútbol', 
      tipoGrass: cancha.tipoGrass, 
      medidas: cancha.medidas,
      precioDia: cancha.precioDia, 
      precioNoche: cancha.precioNoche, 
      estado: cancha.estado,
      idSede: cancha.sede ? cancha.sede.idSede : '' 
    });
    setImagenPreview(cancha.urlImagen);
    setShowModal(true);
  };

  const cerrarYLimpiarModal = () => {
    setShowModal(false); setEditMode(false); setSelectedId(null);
    setNuevaCancha({ nombre: '', deporte: 'Fútbol', tipoGrass: 'Sintético', medidas: '', precioDia: '', precioNoche: '', estado: 'Disponible', idSede: '' });
    setImagenFile(null); setImagenPreview(null);
  };

  const obtenerEstadoVisual = (cancha) => {
    let estadoActual = cancha.estado; 
    
    if (estadoActual === 'Disponible') {
        const ahora = new Date();
        const reservaEnCurso = reservas.find(r => {
            if (r.nombreCancha !== cancha.nombre || r.estado !== 'Confirmada') return false; 
            const inicio = new Date(r.horaInicio);
            const fin = new Date(r.horaFin);
            return ahora >= inicio && ahora < fin; 
        });

        if (reservaEnCurso) estadoActual = 'En uso';
    }

    let colorClase = '';
    switch (estadoActual) {
        case 'Disponible': colorClase = 'bg-green-100 text-green-700'; break;
        case 'En uso': colorClase = 'bg-blue-100 text-blue-700 border border-blue-200 animate-pulse'; break; 
        case 'Mantenimiento': colorClase = 'bg-yellow-100 text-yellow-700'; break;
        case 'Inactiva': colorClase = 'bg-red-100 text-red-700'; break;
        default: colorClase = 'bg-slate-100 text-slate-700';
    }

    return { texto: estadoActual, clase: colorClase };
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative p-4 md:p-8">
        
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ease-out flex items-center gap-3 px-6 py-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] font-bold text-sm ${
            mensajeFlotante.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'
          } ${mensajeFlotante.tipo === 'success' ? 'bg-slate-900 text-white' : 'bg-red-500 text-white'}`}
        >
          {mensajeFlotante.tipo === 'success' ? <CheckCircle className="w-5 h-5 text-green-400" /> : <AlertCircle className="w-5 h-5 text-red-100" />}
          {mensajeFlotante.texto}
        </div>

        <header className="flex justify-between items-center mb-8 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-xl shadow-sm">
              <MapPin className="text-green-600 w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800">Tus Canchas Deportivas</h1>
              <p className="text-sm text-slate-500 font-medium">Administra los campos de tu sede en tiempo real</p>
            </div>
          </div>
          
          {rol === 'SUPER_ADMIN' && (
            <button onClick={() => setShowModal(true)} className="bg-green-600 text-white px-6 py-3.5 rounded-xl flex items-center gap-2 hover:bg-green-700 transition-all font-bold shadow-lg shadow-green-600/20">
              <Plus className="w-5 h-5" /> Nueva Cancha
            </button>
          )}
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pb-20">
          {canchas.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-400 italic bg-white rounded-3xl border border-slate-100">
              No tienes canchas registradas en tu sede.
            </div>
          ) : (
            canchas.map(cancha => {
              const estadoVisual = obtenerEstadoVisual(cancha);

              return (
                <div key={cancha.idCancha} className="group bg-white rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden flex flex-col hover:shadow-xl transition-all duration-300">
                  <div className="h-48 w-full bg-slate-100 relative overflow-hidden">
                    {cancha.urlImagen ? (
                      <img src={cancha.urlImagen} alt={cancha.nombre} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon className="w-12 h-12" /></div>
                    )}
                    
                    {rol === 'SUPER_ADMIN' && (
                      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => prepararEdicion(cancha)} className="bg-white/90 backdrop-blur p-2 rounded-lg text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-lg"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => prepararEliminacion(cancha.idCancha)} className="bg-white/90 backdrop-blur p-2 rounded-lg text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-lg"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    )}
                  </div>

                  <div className="p-6 flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-black text-slate-800 capitalize">{cancha.nombre}</h3>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${estadoVisual.clase}`}>
                        {estadoVisual.texto}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6 pt-2">
                      <div className="bg-orange-50 p-3 rounded-2xl border border-orange-100 text-center relative overflow-hidden">
                        <Sun className="w-8 h-8 text-orange-200 absolute -bottom-2 -left-2 rotate-12" />
                        <p className="text-[10px] text-orange-600 font-bold uppercase relative z-10">Día</p>
                        <p className="text-2xl font-black text-slate-800 relative z-10">S/ {cancha.precioDia}</p>
                      </div>
                      <div className="bg-indigo-50 p-3 rounded-2xl border border-indigo-100 text-center relative overflow-hidden">
                        <Moon className="w-8 h-8 text-indigo-200 absolute -bottom-2 -left-2 -rotate-12" />
                        <p className="text-[10px] text-indigo-600 font-bold uppercase relative z-10">Noche</p>
                        <p className="text-2xl font-black text-slate-800 relative z-10">S/ {cancha.precioNoche}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-slate-400 text-xs sm:text-sm border-t border-slate-100 pt-4">
                      <span className="flex items-center gap-1.5 font-bold" title="Deporte">
                        <Trophy className="w-4 h-4 text-blue-500" /> {cancha.deporte || 'Fútbol'}
                      </span>
                      <span className="flex items-center gap-1.5 font-bold" title="Superficie">
                        <Target className="w-4 h-4 text-green-500" /> {cancha.tipoGrass}
                      </span>
                      <span className="flex items-center gap-1.5 font-bold" title="Medidas">
                        <Maximize className="w-4 h-4 text-slate-400" /> {cancha.medidas}
                      </span>
                    </div>
                    
                    {rol === 'SUPER_ADMIN' && cancha.sede && (
                      <div className="mt-4 text-[10px] font-black tracking-widest uppercase text-purple-600 bg-purple-50 p-2 rounded-lg text-center border border-purple-100 flex justify-center items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" /> Sede: {cancha.sede.nombre}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* MODALES */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-black text-slate-800 text-center mb-2">¿Eliminar Cancha?</h3>
            <p className="text-slate-500 text-center text-sm mb-8 font-medium">
              Esta acción no se puede deshacer. Los datos de la cancha se borrarán permanentemente del sistema.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                Cancelar
              </button>
              <button onClick={confirmarEliminacion} className="flex-1 px-4 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 transition-colors">
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-lg p-8 shadow-2xl relative my-8 animate-in fade-in zoom-in duration-200">
            <button onClick={cerrarYLimpiarModal} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-colors">
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-black text-slate-800 mb-8">{editMode ? 'Actualizar Cancha' : 'Nueva Cancha'}</h2>
            
            <form onSubmit={handleGuardar} className="space-y-6">
              <div className="mb-8">
                {!imagenPreview ? (
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-slate-300 border-dashed rounded-3xl cursor-pointer bg-slate-50 hover:bg-green-50 hover:border-green-400 transition-all duration-300 group">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <UploadCloud className="w-10 h-10 text-slate-400 mb-3 group-hover:text-green-500 transition-colors" />
                      <p className="mb-2 text-sm text-slate-500 font-medium">Sube una <span className="font-semibold text-green-600">Fotografía</span></p>
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={handleImagenChange} />
                  </label>
                ) : (
                  <div className="relative w-full h-48 rounded-3xl overflow-hidden shadow-inner group">
                    <img src={imagenPreview} alt="Preview" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button type="button" onClick={handleRemoverImagen} className="bg-red-500 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:bg-red-600 transition-colors">
                        <X className="w-4 h-4" /> Cambiar Imagen
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase ml-1 tracking-wider">Nombre de la Cancha</label>
                  <input type="text" required className="w-full mt-1.5 p-3.5 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-green-500 font-bold text-slate-700" value={nuevaCancha.nombre} onChange={e => setNuevaCancha({...nuevaCancha, nombre: e.target.value})} />
                </div>
                
                {rol === 'SUPER_ADMIN' && (
                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase ml-1 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-purple-500" /> Sede Perteneciente
                    </label>
                    <select required className="w-full mt-1.5 p-3.5 bg-purple-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 font-bold text-purple-900 appearance-none" value={nuevaCancha.idSede} onChange={e => setNuevaCancha({...nuevaCancha, idSede: e.target.value})}>
                      <option value="" disabled>Selecciona la sede...</option>
                      {sedes.map(s => <option key={s.idSede} value={s.idSede}>{s.nombre}</option>)}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-black text-orange-600 uppercase ml-1 flex items-center gap-1.5"><Sun className="w-3.5 h-3.5" /> Día (S/)</label>
                    <input type="number" required step="0.50" className="w-full mt-1.5 p-3.5 bg-orange-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-slate-700" value={nuevaCancha.precioDia} onChange={e => setNuevaCancha({...nuevaCancha, precioDia: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-black text-indigo-600 uppercase ml-1 flex items-center gap-1.5"><Moon className="w-3.5 h-3.5" /> Noche (S/)</label>
                    <input type="number" required step="0.50" className="w-full mt-1.5 p-3.5 bg-indigo-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700" value={nuevaCancha.precioNoche} onChange={e => setNuevaCancha({...nuevaCancha, precioNoche: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase ml-1 flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5 text-blue-500" /> Deporte</label>
                    <select className="w-full mt-1.5 p-3.5 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 appearance-none cursor-pointer" value={nuevaCancha.deporte} onChange={e => setNuevaCancha({...nuevaCancha, deporte: e.target.value})}>
                      <option value="Fútbol">Fútbol</option>
                      <option value="Vóley">Vóley</option>
                      <option value="Básquet">Básquet</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase ml-1 flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-green-500" /> Tipo (Superficie)</label>
                    <select className="w-full mt-1.5 p-3.5 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-green-500 font-bold text-slate-700 appearance-none cursor-pointer" value={nuevaCancha.tipoGrass} onChange={e => setNuevaCancha({...nuevaCancha, tipoGrass: e.target.value})}>
                      <option value="Sintético">Sintético</option>
                      <option value="Natural">Natural</option>
                      <option value="Híbrido">Híbrido</option>
                      <option value="Arena">Arena</option>
                      <option value="Losa">Losa</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase ml-1 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-blue-500" /> Estado Físico</label>
                    <select className="w-full mt-1.5 p-3.5 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-green-500 font-bold text-slate-700 appearance-none cursor-pointer" value={nuevaCancha.estado} onChange={e => setNuevaCancha({...nuevaCancha, estado: e.target.value})}>
                      <option value="Disponible">Disponible</option>
                      <option value="Mantenimiento">Mantenimiento</option>
                      <option value="Inactiva">Inactiva</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase ml-1 flex items-center gap-1.5"><Maximize className="w-3.5 h-3.5 text-slate-500" /> Medidas</label>
                    <input type="text" required placeholder="Ej: 20x40m" className="w-full mt-1.5 p-3.5 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-green-500 font-bold text-slate-700" value={nuevaCancha.medidas} onChange={e => setNuevaCancha({...nuevaCancha, medidas: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-6 border-t mt-8">
                <button type="submit" className="flex-[2] bg-green-600 text-white font-black py-4 rounded-2xl hover:bg-green-700 shadow-lg shadow-green-200 transition-all">
                  {editMode ? 'Guardar Cambios' : 'Registrar Cancha'}
                </button>
                <button type="button" onClick={cerrarYLimpiarModal} className="flex-1 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}