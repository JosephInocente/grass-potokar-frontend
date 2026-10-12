import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Users, Shield, Building2, X, 
  Trash2, CheckSquare, Square, Edit2, AlertTriangle, CheckCircle, XCircle 
} from 'lucide-react';
import api from '../../../api/axiosConfig';

import Sidebar from '../../../components/Sidebar';

export default function GestionPersonal() {
  const [personal, setPersonal] = useState([]);
  const [sedes, setSedes] = useState([]);
  
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [mensajeFlotante, setMensajeFlotante] = useState({ visible: false, texto: '', tipo: 'success' });
  
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const [nuevoUser, setNuevoUser] = useState({ 
    nombre: '', email: '', password: '', idRol: 1, idSede: '' 
  });

  const [permisos, setPermisos] = useState({
    dashboard: true, reservas: true, canchas: true, clientes: true, pagos: true, reportes: false 
  });
  
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const rol = localStorage.getItem('rol');
  const miEmail = localStorage.getItem('email');

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    if (rol !== 'SUPER_ADMIN') { navigate('/dashboard'); return; }
    cargarDatos();
    // eslint-disable-next-line
  }, [token, rol, navigate]);

  const cargarDatos = async () => {
    try {
      const resUsers = await api.get('/usuarios');
      const resSedes = await api.get('/sedes');
      
      if (Array.isArray(resUsers.data)) {
        setPersonal(resUsers.data.filter(u => u.idRol !== 2 && u.rol !== 2 && u.idRol !== 4)); 
      } else {
        setPersonal([]);
      }

      if (Array.isArray(resSedes.data)) {
        setSedes(resSedes.data);
      } else {
        setSedes([]);
      }
    } catch (error) { 
      console.error("Error cargando personal:", error); 
      setPersonal([]);
    }
  };

  const mostrarMensaje = (texto, tipo = 'success') => {
    setMensajeFlotante({ visible: true, texto, tipo });
    setTimeout(() => setMensajeFlotante(prev => ({ ...prev, visible: false })), 3500);
  };

  const handleTogglePermiso = (modulo) => {
    setPermisos(prev => ({ ...prev, [modulo]: !prev[modulo] }));
  };

  const prepararEdicion = (usuario) => {
    setEditMode(true);
    setSelectedId(usuario.idUsuario);
    setNuevoUser({
      nombre: usuario.nombre,
      email: usuario.email,
      password: '',
      idRol: usuario.idRol || 1,
      idSede: usuario.sede ? usuario.sede.idSede : ''
    });

    if (usuario.permisos) {
      try {
        setPermisos(JSON.parse(usuario.permisos));
      } catch (e) {
        setPermisos({ dashboard: true, reservas: true, canchas: true, clientes: true, pagos: true, reportes: false });
      }
    } else {
        setPermisos({ dashboard: true, reservas: true, canchas: true, clientes: true, pagos: true, reportes: false });
    }
    
    setShowModal(true);
  };

  const cerrarYLimpiarModal = () => {
    setShowModal(false);
    setEditMode(false);
    setSelectedId(null);
    setNuevoUser({ nombre: '', email: '', password: '', idRol: 1, idSede: '' });
    setPermisos({ dashboard: true, reservas: true, canchas: true, clientes: true, pagos: true, reportes: false });
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    const payload = { ...nuevoUser, permisos: JSON.stringify(permisos) };

    try {
      if (editMode) {
        await api.put(`/usuarios/personal/${selectedId}`, payload);
        mostrarMensaje("Personal actualizado correctamente.", 'success');
      } else {
        await api.post('/usuarios/personal', payload);
        mostrarMensaje("Personal contratado correctamente.", 'success');
      }
      cerrarYLimpiarModal();
      cargarDatos();
    } catch (error) { 
      mostrarMensaje("Error al guardar los datos del personal.", 'error'); 
    }
  };

  // 🟢 AJUSTE: Abrimos el modal propio en lugar del alert nativo
  const prepararEliminacion = (idUsuario) => {
    setUserToDelete(idUsuario);
    setShowDeleteModal(true);
  };

  // 🟢 AJUSTE: Ejecutamos el borrado desde el modal propio
  const confirmarEliminacion = async () => {
    if (!userToDelete) return;
    try {
      await api.delete(`/usuarios/${userToDelete}`);
      mostrarMensaje("Personal eliminado del sistema.", 'success');
      cargarDatos();
    } catch (error) {
      mostrarMensaje("No se pudo eliminar al usuario. Es posible que tenga registros asociados.", 'error');
    } finally {
      setShowDeleteModal(false);
      setUserToDelete(null);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative p-4 md:p-8">
        
        {/* 🟢 NUEVO: Mensaje Flotante Global */}
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl font-bold text-sm ${
            mensajeFlotante.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'
          } ${mensajeFlotante.tipo === 'success' ? 'bg-[#00C193] text-white' : 'bg-red-500 text-white'}`}
        >
          {mensajeFlotante.tipo === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          {mensajeFlotante.texto}
        </div>

        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 bg-white p-6 rounded-[2rem] shadow-[0_0_40px_rgba(168,85,247,0.08)] border-2 border-purple-50 gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-purple-100 p-3 rounded-2xl"><Users className="text-purple-600 w-7 h-7" /></div>
            <div>
              <h1 className="text-2xl font-black text-slate-800">Gestión de Personal <span className="text-sm font-bold bg-purple-100 text-purple-600 px-2 py-1 rounded-lg ml-2 align-middle">Solo Súper Admin</span></h1>
              <p className="text-sm text-slate-500 font-medium mt-1">Control absoluto de accesos y credenciales de la empresa.</p>
            </div>
          </div>
          <button onClick={() => setShowModal(true)} className="w-full sm:w-auto bg-slate-900 text-white px-6 py-3.5 rounded-xl flex justify-center items-center gap-2 hover:bg-slate-800 transition-all font-bold shadow-lg shadow-slate-900/20">
            <Plus className="w-5 h-5" /> Nuevo Colaborador
          </button>
        </header>

        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-widest border-b border-slate-100">
                  <th className="p-5 font-black">Nombre / Email</th>
                  <th className="p-5 font-black">Rol Oficial</th>
                  <th className="p-5 font-black">Sede Asignada</th>
                  <th className="p-5 font-black text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {personal.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center p-8 text-slate-400 font-medium">No hay personal registrado o hubo un error al cargar.</td>
                  </tr>
                ) : (
                  personal.map(u => {
                    const rolNum = u.idRol || u.rol?.id_rol || parseInt(u.rol) || 1;
                    const esSuperAdmin = rolNum === 3;

                    return (
                      <tr key={u.idUsuario || u.email} className="hover:bg-slate-50 transition-colors">
                        <td className="p-5">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 mb-0.5">{u.nombre}</span>
                            <span className="text-xs font-medium text-slate-400">{u.email}</span>
                          </div>
                        </td>
                        <td className="p-5">
                          <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 w-fit ${
                            esSuperAdmin 
                              ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                              : 'bg-blue-50 text-blue-600 border border-blue-100'
                          }`}>
                            {esSuperAdmin && <Shield className="w-3 h-3" />}
                            {esSuperAdmin ? 'Súper Admin' : 'Administrador'}
                          </span>
                        </td>
                        <td className="p-5 font-bold text-slate-600 text-sm">
                          <div className="flex items-center gap-2">
                            <Building2 className={`w-4 h-4 ${esSuperAdmin ? 'text-purple-400' : 'text-slate-400'}`} /> 
                            {esSuperAdmin ? 'Control Global' : (u.sede?.nombre || 'Sin Sede Asignada')}
                          </div>
                        </td>
                        <td className="p-5 text-center">
                          {u.email !== miEmail ? (
                              <div className="flex justify-center gap-2">
                                <button onClick={() => prepararEdicion(u)} className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-2.5 rounded-xl transition-colors">
                                  <Edit2 className="w-5 h-5" />
                                </button>
                                {/* 🟢 AJUSTE: Ahora llama a la nueva función */}
                                <button onClick={() => prepararEliminacion(u.idUsuario)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2.5 rounded-xl transition-colors">
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                          ) : (
                              <span className="text-[10px] font-bold text-slate-300 uppercase">Tú</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* MODAL CREAR / EDITAR */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-xl p-8 shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <button onClick={cerrarYLimpiarModal} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-black text-slate-800 mb-2">{editMode ? 'Actualizar Colaborador' : 'Contratar Personal'}</h2>
            <p className="text-slate-500 text-sm font-medium mb-6">Asigna credenciales, sede y permisos específicos.</p>
            
            <form onSubmit={handleGuardar} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Nombre Completo</label>
                    <input type="text" placeholder="Ej: Juan Pérez" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500 focus:bg-white transition-colors font-bold text-slate-700 text-sm" value={nuevoUser.nombre} onChange={e => setNuevoUser({...nuevoUser, nombre: e.target.value})} required />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Correo Electrónico</label>
                    <input type="email" placeholder="correo@empresa.com" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500 focus:bg-white transition-colors font-bold text-slate-700 text-sm" value={nuevoUser.email} onChange={e => setNuevoUser({...nuevoUser, email: e.target.value})} required />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Contraseña</label>
                    <input type="password" placeholder={editMode ? "Vacío para no cambiar" : "••••••••"} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500 focus:bg-white transition-colors font-bold text-slate-700 text-sm" value={nuevoUser.password} onChange={e => setNuevoUser({...nuevoUser, password: e.target.value})} required={!editMode} />
                  </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Nivel de Acceso</label>
                  <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500 focus:bg-white transition-colors font-bold text-slate-700 text-sm appearance-none cursor-pointer" value={nuevoUser.idRol} onChange={e => setNuevoUser({...nuevoUser, idRol: parseInt(e.target.value)})}>
                    <option value="1">Administrador de Sede</option>
                    <option value="3">Súper Admin (Socio)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Sede Asignada</label>
                  <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500 focus:bg-white transition-colors font-bold text-slate-700 text-sm appearance-none cursor-pointer disabled:opacity-50" value={nuevoUser.idSede} onChange={e => setNuevoUser({...nuevoUser, idSede: e.target.value})} required={nuevoUser.idRol === 1} disabled={nuevoUser.idRol === 3}>
                    <option value="" disabled>Elegir Sede...</option>
                    {sedes.map(s => <option key={s.idSede} value={s.idSede}>{s.nombre}</option>)}
                  </select>
                </div>
              </div>

              <div className="mt-6 bg-[#F8FAFC] border border-slate-200 p-4 rounded-xl">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Opciones de visualización:</p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {Object.keys(permisos).map((modulo) => (
                      <label key={modulo} className="flex items-center gap-2 cursor-pointer group">
                        <div onClick={() => handleTogglePermiso(modulo)}>
                          {permisos[modulo] ? (
                            <CheckSquare className="w-5 h-5 text-[#00C193]" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-300 group-hover:text-slate-400 transition-colors" />
                          )}
                        </div>
                        <span className={`text-xs font-bold capitalize ${permisos[modulo] ? 'text-slate-800' : 'text-slate-400'}`}>
                          {modulo === 'dashboard' ? 'Dashboard Principal' : 
                           modulo === 'reservas' ? 'Gestión Reservas' :
                           modulo === 'canchas' ? 'Gestión Canchas' :
                           modulo === 'clientes' ? 'Listado Clientes' :
                           modulo === 'pagos' ? 'Control de Pagos' : 'Reportes Financieros'}
                        </span>
                      </label>
                    ))}
                  </div>

                  {nuevoUser.idRol === 1 && (
                      <p className="text-[10px] text-blue-600 font-bold mt-4 bg-blue-50 p-2 rounded-lg text-center">
                          🔒 Restricción activa: Solo verá datos pertenecientes a su sede asignada.
                      </p>
                  )}
              </div>

              <div className="flex gap-3 mt-4">
                  <button type="button" onClick={cerrarYLimpiarModal} className="flex-1 bg-slate-100 text-slate-600 font-bold py-4 rounded-xl hover:bg-slate-200 transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" className="flex-[2] bg-slate-900 text-white font-black py-4 rounded-xl hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all">
                    {editMode ? 'Actualizar Colaborador' : 'Guardar Cuenta'}
                  </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🟢 NUEVO: MODAL ELIMINAR PERSONAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-black text-slate-800 text-center mb-2">¿Despedir Personal?</h3>
            <p className="text-slate-500 text-center text-sm mb-8 font-medium">
              El usuario perderá el acceso inmediatamente. Solo podrás eliminarlo si no tiene registros históricos (como reservas procesadas).
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">
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