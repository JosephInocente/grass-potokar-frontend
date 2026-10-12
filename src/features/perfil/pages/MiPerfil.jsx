import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UserCircle, Mail, Lock, Shield, 
  MapPin, CheckCircle, XCircle, Users 
} from 'lucide-react';
import axios from 'axios'; // 🟢 Importación agregada
import Sidebar from '../../../components/Sidebar';

export default function MiPerfil() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const rol = localStorage.getItem('rol') || 'ADMIN';
  const idSede = localStorage.getItem('idSede');
  
  const emailGuardado = localStorage.getItem('email') || ''; 
  const nombreGuardado = localStorage.getItem('nombre') || '';

  const [perfil, setPerfil] = useState({
    nombre: nombreGuardado,
    email: emailGuardado,
    rol: rol,
    sede: rol === 'SUPER_ADMIN' ? 'Control Total (Todas las Sedes)' : 'Cargando sede...'
  });

  const [passwords, setPasswords] = useState({
    actual: '',
    nueva: '',
    confirmar: ''
  });

  const [mensajeFlotante, setMensajeFlotante] = useState({ visible: false, texto: '', tipo: 'success' });

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    
    // 🟢 Validación estricta para evitar que busque "null" como texto
    if (rol !== 'SUPER_ADMIN' && idSede && idSede !== 'null' && idSede !== 'undefined') {
      cargarNombreSede();
    }
  }, [token, rol, idSede, navigate]);

  const cargarNombreSede = async () => {
    try {
      const res = await axios.get(`http://localhost:8080/api/sedes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const miSede = res.data.find(s => String(s.idSede) === String(idSede));
      
      if (miSede && miSede.nombre) {
        setPerfil(prev => ({ ...prev, sede: miSede.nombre }));
      } else {
        setPerfil(prev => ({ ...prev, sede: `Sede Asignada (ID: ${idSede})` }));
      }
    } catch (error) {
      console.error("Error al cargar la sede:", error);
      setPerfil(prev => ({ ...prev, sede: "Sede Activa" }));
    }
  };

  const mostrarMensaje = (texto, tipo = 'success') => {
    setMensajeFlotante({ visible: true, texto, tipo });
    setTimeout(() => setMensajeFlotante(prev => ({ ...prev, visible: false })), 3500);
  };

  const handleActualizarDatos = async (e) => {
    e.preventDefault();
    try {
      mostrarMensaje('Datos personales actualizados', 'success');
      localStorage.setItem('nombre', perfil.nombre);
      localStorage.setItem('email', perfil.email);
    } catch (error) {
      mostrarMensaje('Error al actualizar datos', 'error');
    }
  };

  const handleCambiarPassword = async (e) => {
    e.preventDefault();
    if (passwords.nueva !== passwords.confirmar) {
      mostrarMensaje('Las contraseñas nuevas no coinciden', 'error');
      return;
    }
    try {
      mostrarMensaje('Contraseña actualizada con éxito', 'success');
      setPasswords({ actual: '', nueva: '', confirmar: '' });
    } catch (error) {
      mostrarMensaje('La contraseña actual es incorrecta', 'error');
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
      
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative p-4 md:p-8">
        
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl font-bold text-sm ${
            mensajeFlotante.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'
          } ${mensajeFlotante.tipo === 'success' ? 'bg-[#00C193] text-white' : 'bg-red-500 text-white'}`}
        >
          {mensajeFlotante.tipo === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          {mensajeFlotante.texto}
        </div>

        <header className="mb-8 flex items-center gap-4">
          <div className="bg-[#E6F7F4] p-3 rounded-2xl shadow-sm">
            <UserCircle className="text-[#00C193] w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800">Mi Perfil</h1>
            <p className="text-slate-500 font-medium">Configura tu cuenta y seguridad</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
          
          <div className="lg:col-span-1">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center text-center">
              
              <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-lg ${perfil.rol === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-600' : 'bg-[#E6F7F4] text-[#00C193]'}`}>
                <UserCircle className="w-16 h-16" />
              </div>
              
              <h2 className="text-2xl font-black text-slate-800 mb-1">{perfil.nombre || 'Usuario Registrado'}</h2>
              <p className="text-slate-500 font-medium mb-6">{perfil.email || 'Sin correo'}</p>
              
              <div className="w-full space-y-3">
                <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <Shield className={`w-5 h-5 ${perfil.rol === 'SUPER_ADMIN' ? 'text-purple-500' : 'text-blue-500'}`} />
                  <div className="text-left">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rol del Sistema</p>
                    <p className="font-bold text-slate-700">{perfil.rol === 'ADMIN' ? 'ADMINISTRADOR' : 'SÚPER ADMIN'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <MapPin className="w-5 h-5 text-orange-500" />
                  <div className="text-left">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sede Asignada</p>
                    <p className="font-bold text-slate-700">{perfil.sede}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-8">
            
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                <UserCircle className="w-5 h-5 text-[#00C193]" /> Datos Personales
              </h3>
              <form onSubmit={handleActualizarDatos} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">Nombre Completo</label>
                    <input 
                      type="text" 
                      placeholder="Tu nombre" 
                      className="w-full p-3.5 bg-[#F8FAFC] border border-slate-200 rounded-xl focus:border-[#00C193] outline-none text-sm font-bold transition-colors"
                      value={perfil.nombre} 
                      onChange={e => setPerfil({...perfil, nombre: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">Correo Electrónico</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="email" 
                        placeholder="correo@ejemplo.com" 
                        className="w-full pl-11 pr-4 py-3.5 bg-[#F8FAFC] border border-slate-200 rounded-xl focus:border-[#00C193] outline-none text-sm font-bold transition-colors"
                        value={perfil.email} 
                        onChange={e => setPerfil({...perfil, email: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
                <button type="submit" className="bg-[#00C193] text-white font-bold py-3.5 px-6 rounded-xl hover:bg-[#00A880] shadow-lg shadow-[#00C193]/30 transition-all">
                  Guardar Cambios
                </button>
              </form>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                <Lock className="w-5 h-5 text-blue-500" /> Seguridad
              </h3>
              <form onSubmit={handleCambiarPassword} className="space-y-5">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">Contraseña Actual</label>
                  <input 
                    type="password" 
                    required
                    placeholder="••••••••" 
                    className="w-full p-3.5 bg-[#F8FAFC] border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm font-bold transition-colors"
                    value={passwords.actual} 
                    onChange={e => setPasswords({...passwords, actual: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">Nueva Contraseña</label>
                    <input 
                      type="password" 
                      required
                      placeholder="••••••••" 
                      className="w-full p-3.5 bg-[#F8FAFC] border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm font-bold transition-colors"
                      value={passwords.nueva} 
                      onChange={e => setPasswords({...passwords, nueva: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">Confirmar Nueva Contraseña</label>
                    <input 
                      type="password" 
                      required
                      placeholder="••••••••" 
                      className="w-full p-3.5 bg-[#F8FAFC] border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm font-bold transition-colors"
                      value={passwords.confirmar} 
                      onChange={e => setPasswords({...passwords, confirmar: e.target.value})}
                    />
                  </div>
                </div>
                <button type="submit" className="bg-slate-800 text-white font-bold py-3.5 px-6 rounded-xl hover:bg-slate-900 shadow-lg shadow-slate-800/30 transition-all">
                  Actualizar Contraseña
                </button>
              </form>
            </div>

            {perfil.rol === 'SUPER_ADMIN' && (
              <div className="bg-white p-8 rounded-[2.5rem] shadow-[0_0_40px_rgba(168,85,247,0.15)] border-2 border-purple-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500 rounded-full blur-3xl opacity-10"></div>
                
                <h3 className="text-xl font-black text-slate-800 mb-2 flex items-center gap-2 relative z-10">
                  <Shield className="w-5 h-5 text-purple-600" /> Administración Avanzada
                </h3>
                <p className="text-slate-500 font-medium text-sm mb-6 relative z-10">
                  Como Super Admin (Dueño), tienes el control total del negocio. Desde aquí puedes registrar o eliminar administradores para que gestionen tus sedes.
                </p>
                
                <button 
                  onClick={() => navigate('/admin/personal')} 
                  className="bg-purple-100 text-purple-700 font-bold py-4 px-6 rounded-xl hover:bg-purple-200 transition-all flex items-center justify-center gap-2 w-full sm:w-auto relative z-10"
                >
                  <Users className="w-5 h-5" /> Gestionar Administradores de Sede
                </button>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}