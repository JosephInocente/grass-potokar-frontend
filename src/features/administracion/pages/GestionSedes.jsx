import React, { useEffect, useState } from 'react';
import { SedeContext } from '../../../context/SedeContext';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, MapPin, Phone, Plus, 
  Edit3, Trash2, CheckCircle, XCircle, X, AlertTriangle
} from 'lucide-react';
import api from '../../../api/axiosConfig'; 
import Sidebar from '../../../components/Sidebar';

export default function GestionSedes() {
  const [sedes, setSedes] = useState([]);
  
  const [showModal, setShowModal] = useState(false);
  const [sedeActual, setSedeActual] = useState(null); 
  const [formData, setFormData] = useState({ nombre: '', ciudad: '', direccion: '', telefono: '' });
  
  const [sedeToDelete, setSedeToDelete] = useState(null);
  const [mensajeFlotante, setMensajeFlotante] = useState({ visible: false, texto: '', tipo: 'success' });

  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const rol = localStorage.getItem('rol');

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    if (rol !== 'ADMIN' && rol !== 'SUPER_ADMIN') { navigate('/catalogo'); return; }
    cargarSedes();
  }, [token, rol, navigate]);

  const cargarSedes = async () => {
    try {
      const res = await api.get('/sedes');
      
      if (Array.isArray(res.data)) {
        setSedes(res.data);
      } else {
        setSedes([]);
        console.warn("La respuesta no es un array válido", res.data);
      }
    } catch (error) {
      console.error(error);
      setSedes([]);
      mostrarMensaje('Error al cargar las sedes', 'error');
    }
  };

  const mostrarMensaje = (texto, tipo = 'success') => {
    setMensajeFlotante({ visible: true, texto, tipo });
    setTimeout(() => setMensajeFlotante(prev => ({ ...prev, visible: false })), 3500);
  };

  const abrirModalNuevaSede = () => {
    setSedeActual(null);
    setFormData({ nombre: '', ciudad: '', direccion: '', telefono: '' });
    setShowModal(true);
  };

  const abrirModalEditar = (sede) => {
    setSedeActual(sede);
    setFormData({ 
      nombre: sede.nombre, 
      ciudad: sede.ciudad, 
      direccion: sede.direccion, 
      telefono: sede.telefono || '' 
    });
    setShowModal(true);
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    try {
      if (sedeActual) {
        const payload = { ...formData, idSede: sedeActual.idSede };
        
        await api.put(`/sedes/${sedeActual.idSede}`, payload);
        mostrarMensaje('Sede actualizada con éxito', 'success');
      } else {
        await api.post('/sedes', formData);
        mostrarMensaje('Sede creada con éxito', 'success');
      }
      setShowModal(false);
      cargarSedes();
    } catch (error) {
      console.error(error);
      mostrarMensaje('Error al guardar la sede', 'error');
    }
  };

  const confirmarEliminacion = async () => {
    if (!sedeToDelete) return;
    try {
      await api.delete(`/sedes/${sedeToDelete}`);
      mostrarMensaje('Sede eliminada del sistema', 'success');
      cargarSedes();
    } catch (error) {
      console.error(error);
      // 🟢 AJUSTE: El mensaje ahora explica el problema real de PostgreSQL
      mostrarMensaje('No se puede eliminar la sede porque tiene usuarios o canchas asociadas.', 'error');
    } finally {
      setSedeToDelete(null);
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
      
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative">
        
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl font-bold text-sm ${
            mensajeFlotante.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'
          } ${mensajeFlotante.tipo === 'success' ? 'bg-[#00C193] text-white' : 'bg-red-500 text-white'}`}
        >
          {mensajeFlotante.tipo === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          {mensajeFlotante.texto}
        </div>

        <div className="p-6 md:p-8">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-[#E6F7F4] p-3 rounded-xl shadow-sm">
                <Building2 className="text-[#00C193] w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-800">Sedes y Complejos</h1>
                <p className="text-sm text-slate-500 font-medium mt-1">Administra las sucursales de tu negocio</p>
              </div>
            </div>
            
            <button 
              onClick={abrirModalNuevaSede}
              className="bg-[#00C193] text-white font-bold py-3 px-6 rounded-xl hover:bg-[#00A880] transition-all shadow-lg shadow-[#00C193]/30 flex items-center gap-2 w-full md:w-auto justify-center"
            >
              <Plus className="w-5 h-5" /> Registrar Nueva Sede
            </button>
          </header>

          {sedes.length === 0 ? (
            <div className="bg-white rounded-[2rem] p-12 text-center border border-slate-100 border-dashed shadow-sm">
              <Building2 className="w-16 h-16 mx-auto text-slate-200 mb-4" />
              <h3 className="text-xl font-black text-slate-700 mb-2">No hay sedes registradas</h3>
              <p className="text-slate-400 font-medium">Haz clic en "Registrar Nueva Sede" para comenzar a expandir tu negocio.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
              {sedes.map((sede) => (
                <div key={sede.idSede} className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden hover:shadow-lg transition-all group flex flex-col">
                  
                  <div className="p-6 border-b border-slate-50 flex justify-between items-start">
                    <div className="pr-4">
                      <h3 className="text-xl font-black text-slate-800 mb-2 leading-tight">{sede.nombre}</h3>
                      <span className="bg-[#EAF9F1] text-[#00C193] text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">
                        Sucursal Activa
                      </span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button 
                        onClick={() => abrirModalEditar(sede)}
                        className="p-2 text-slate-400 hover:text-[#00C193] hover:bg-[#EAF9F1] rounded-xl transition-colors"
                        title="Editar Sede"
                      >
                        <Edit3 className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => setSedeToDelete(sede.idSede)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        title="Eliminar Sede"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="p-6 flex-1 space-y-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Ubicación</p>
                        <p className="font-bold text-slate-700">{sede.direccion}</p>
                        <p className="text-sm text-slate-500 font-medium">{sede.ciudad}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-slate-400 shrink-0" />
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Contacto</p>
                        <p className="font-bold text-slate-700">{sede.telefono || 'No registrado'}</p>
                      </div>
                    </div>
                  </div>
                  
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-lg p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-[#E6F7F4] p-2.5 rounded-xl">
                <Building2 className="text-[#00C193] w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-slate-800">
                {sedeActual ? 'Editar Sede' : 'Nueva Sede'}
              </h2>
            </div>

            <form onSubmit={handleGuardar} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-2">Nombre del Complejo</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej: Sede Principal Tingo María"
                  className="w-full p-3.5 bg-[#F8FAFC] border border-slate-200 rounded-xl outline-none focus:border-[#00C193] focus:ring-1 focus:ring-[#00C193] transition-all font-bold text-slate-700 text-sm"
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-2">Ciudad</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ej: Huánuco"
                    className="w-full p-3.5 bg-[#F8FAFC] border border-slate-200 rounded-xl outline-none focus:border-[#00C193] focus:ring-1 focus:ring-[#00C193] transition-all font-bold text-slate-700 text-sm"
                    value={formData.ciudad}
                    onChange={(e) => setFormData({...formData, ciudad: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-2">Teléfono</label>
                  <input 
                    type="text" 
                    placeholder="Ej: 999 888 777"
                    className="w-full p-3.5 bg-[#F8FAFC] border border-slate-200 rounded-xl outline-none focus:border-[#00C193] focus:ring-1 focus:ring-[#00C193] transition-all font-bold text-slate-700 text-sm"
                    value={formData.telefono}
                    onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-2">Dirección Completa</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej: Av. Alameda Perú 123"
                  className="w-full p-3.5 bg-[#F8FAFC] border border-slate-200 rounded-xl outline-none focus:border-[#00C193] focus:ring-1 focus:ring-[#00C193] transition-all font-bold text-slate-700 text-sm"
                  value={formData.direccion}
                  onChange={(e) => setFormData({...formData, direccion: e.target.value})}
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-3.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 px-4 py-3.5 bg-[#00C193] text-white font-bold rounded-xl hover:bg-[#00A880] shadow-lg shadow-[#00C193]/30 transition-colors">
                  {sedeActual ? 'Guardar Cambios' : 'Crear Sede'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {sedeToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-black text-slate-800 text-center mb-2">¿Eliminar Sede?</h3>
            <p className="text-slate-500 text-center text-sm mb-8 font-medium">
              {/* 🟢 AJUSTE: El texto del modal ahora informa sobre la restricción completa */}
              Estás a punto de eliminar esta sucursal de la base de datos. Solo se podrá borrar si no tiene canchas ni usuarios asignados.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setSedeToDelete(null)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                Cancelar
              </button>
              <button onClick={confirmarEliminacion} className="flex-1 px-4 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 transition-colors">
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}