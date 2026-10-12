import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Registro() {
  const [formData, setFormData] = useState({ nombre: '', email: '', password: '' });
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const navigate = useNavigate();

  const handleRegistro = async (e) => {
    e.preventDefault();
    try {
      const respuesta = await axios.post('http://localhost:8080/api/auth/registro', formData);
      
      if (respuesta.status === 200) {
        setMensaje({ texto: '¡Cuenta creada con éxito! Redirigiendo al login...', tipo: 'success' });
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (error) {
      setMensaje({ 
        texto: error.response?.data || 'Error al registrar. Inténtalo de nuevo.', 
        tipo: 'error' 
      });
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden font-sans">
      <div className="absolute inset-0 z-0 bg-[url(/src/assets/grass.jpg)] bg-cover bg-center" aria-hidden="true" />
      <div className="absolute inset-0 z-0 bg-black/60" aria-hidden="true" />

      <div className="relative z-10 bg-white shadow-2xl rounded-3xl overflow-hidden max-w-4xl w-full flex flex-col md:flex-row">
        
        {/* Sección Izquierda */}
        <div className="hidden md:flex md:w-1/2 bg-indigo-600 p-12 flex-col justify-center text-white relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-4xl font-bold mb-6 leading-tight">Únete a la <br />Comunidad</h2>
            <p className="text-indigo-100 text-lg">Crea tu cuenta gratis y empieza a reservar las mejores canchas deportivas de la ciudad al instante.</p>
          </div>
          <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-indigo-500 rounded-full opacity-50 blur-3xl"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-48 h-48 bg-indigo-700 rounded-full opacity-50 blur-2xl"></div>
        </div>

        {/* Sección Derecha: Formulario */}
        <div className="w-full md:w-1/2 p-8 md:p-12">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Crear Cuenta</h1>
          <p className="text-slate-500 mb-8">Completa tus datos para registrarte como cliente.</p>

          {mensaje.texto && (
            <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm font-bold ${mensaje.tipo === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              <CheckCircle className="w-5 h-5" /> {mensaje.texto}
            </div>
          )}

          <form onSubmit={handleRegistro} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Nombre Completo</label>
              <div className="relative group">
                <User className="absolute left-3 top-3 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="text" 
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="Ej: Juan Pérez"
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Correo Electrónico</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="email" 
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="ejemplo@correo.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Contraseña</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="password" 
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="Crea una contraseña segura"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                />
              </div>
            </div>

            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-200 transition-all flex justify-center items-center gap-2">
              Registrarme <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          <p className="mt-8 text-center text-slate-600 text-sm">
            ¿Ya tienes cuenta? <button onClick={() => navigate('/login')} className="text-indigo-600 font-bold hover:underline">Inicia Sesión aquí</button>
          </p>
        </div>
      </div>
    </div>
  );
}