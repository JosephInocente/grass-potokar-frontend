import { useState } from 'react';
import { Mail, Lock, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// IMPORTACIONES DE FIREBASE
import { auth, googleProvider } from '../../../config/firebase'; // Ajusta la ruta si es necesario
import { signInWithPopup } from 'firebase/auth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  //  MANEJADOR REAL DE GOOGLE AUTH
  const handleGoogleLogin = async () => {
    try {
      // 1. Firebase abre la ventana de Google
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const emailGoogle = user.email;
      const nombreGoogle = user.displayName;

      // 2. Enviamos el correo a nuestro backend
      const respuesta = await axios.post('http://localhost:8080/api/auth/google', {
        email: emailGoogle,
        nombre: nombreGoogle
      });

      if (respuesta.status === 200) {
        const { token, rol, idUsuario, idSede, mensaje } = respuesta.data;

        // Limpiamos el nombre
        let nombreExtraido = nombreGoogle || 'Usuario';
        if (mensaje && mensaje.includes('¡Bienvenido')) {
            nombreExtraido = mensaje.replace('¡Bienvenido ', '').replace('!', '');
        }

        // GUARDAMOS EN EL NAVEGADOR
        localStorage.setItem('token', token);
        localStorage.setItem('rol', rol); 
        localStorage.setItem('idUsuario', idUsuario);
        localStorage.setItem('email', emailGoogle); 
        localStorage.setItem('nombre', nombreExtraido); 
        
        if (idSede) localStorage.setItem('idSede', idSede);
        
        // REDIRECCIÓN INTELIGENTE
        if (rol === 'ADMIN' || rol === 'SUPER_ADMIN' || rol === 'CAJERO') {
          navigate('/dashboard'); 
        } else {
          navigate('/catalogo'); 
        }
      }

    } catch (error) {
      console.error("Error con la autenticación de Google:", error);
      // Ignoramos si el usuario cerró la ventana por error
      if (error.code !== 'auth/popup-closed-by-user') {
        alert("Hubo un problema al conectar con Google. Inténtalo de nuevo.");
      }
    }
  };

  // MANEJADOR TRADICIONAL (CORREO / CONTRASEÑA)
  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Limpiamos el almacenamiento antes de un nuevo intento
    localStorage.clear();
    
    try {
      const respuesta = await axios.post('http://localhost:8080/api/auth/login', {
        email: email,
        password: password
      });

      if (respuesta.status === 200) {
        const { token, rol, idUsuario, idSede, mensaje } = respuesta.data;

        let nombreExtraido = 'Usuario';
        if (mensaje) {
            nombreExtraido = mensaje.replace('¡Bienvenido ', '').replace('!', '');
        }

        // GUARDAMOS EN EL NAVEGADOR
        localStorage.setItem('token', token);
        localStorage.setItem('rol', rol); 
        localStorage.setItem('idUsuario', idUsuario);
        localStorage.setItem('email', email); 
        localStorage.setItem('nombre', nombreExtraido); 
        
        if (idSede) {
            localStorage.setItem('idSede', idSede);
        }
        
        // REDIRECCIÓN INTELIGENTE
        if (rol === 'ADMIN' || rol === 'SUPER_ADMIN' || rol === 'CAJERO') {
          navigate('/dashboard'); 
        } else {
          navigate('/catalogo'); 
        }
      }
      
    } catch (error) {
      console.error("Error en la autenticación:", error);
      if (error.response && error.response.status === 401) {
        alert("Credenciales incorrectas. Inténtalo de nuevo.");
      } else {
        alert("No se pudo conectar con el servidor. Verifica que Spring Boot esté corriendo.");
      }
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden font-sans">
      
      {/* CAPA DE FONDO: Imagen de Grass */}
      <div
        className="absolute inset-0 z-0 bg-[url(/src/assets/grass.jpg)] bg-cover bg-center"
        aria-hidden="true"
      />
      
      {/* OVERLAY: Oscurecimiento para contraste */}
      <div className="absolute inset-0 z-0 bg-black/50" aria-hidden="true" />

      {/* TARJETA DE LOGIN */}
      <div className="relative z-10 bg-[#1A1A1A] shadow-2xl rounded-3xl overflow-hidden max-w-4xl w-full flex flex-col md:flex-row border border-[#333333]">
        
        {/* Sección Izquierda: Identidad Visual */}
        <div className="hidden md:flex md:w-1/2 bg-green-600 p-12 flex-col justify-center text-white relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-4xl font-bold mb-6 leading-tight">
              Gestión de <br /> Grass Sintético
            </h2>
            <p className="text-green-100 text-lg">
              La plataforma líder para la administración de complejos deportivos.
            </p>
          </div>
          
          <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-green-500 rounded-full opacity-50 blur-3xl"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-48 h-48 bg-green-700 rounded-full opacity-50 blur-2xl"></div>
          
          <div className="mt-12 pt-12 border-t border-green-500/30 text-sm text-green-200">
            © 2026 UNAS - Facultad de Ingeniería
          </div>
        </div>

        {/* Sección Derecha: Formulario */}
        <div className="w-full md:w-1/2 p-8 md:p-12 text-white">
          <div className="flex justify-center md:justify-start mb-8">
            <div className="bg-[#2A2A2A] p-3 rounded-2xl border border-[#333333]">
              <LogIn className="text-white w-8 h-8" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-2">¡Bienvenido!</h1>
          <p className="text-slate-400 mb-8">Ingresa para Realizar tu Reserva.</p>

          {/*  BOTÓN GOOGLE */}
          <button 
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-[#2A2A2A] border border-[#444444] hover:bg-[#333333] text-white font-medium py-3 rounded-xl transition-all"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.66 15.63 16.88 16.79 15.71 17.57V20.34H19.28C21.36 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4"/>
              <path d="M12 23C14.97 23 17.46 22.02 19.28 20.34L15.71 17.57C14.73 18.23 13.48 18.63 12 18.63C9.14 18.63 6.71 16.7 5.82 14.12H2.13V16.98C3.96 20.61 7.7 23 12 23Z" fill="#34A853"/>
              <path d="M5.82 14.12C5.59 13.46 5.46 12.75 5.46 12C5.46 11.25 5.59 10.54 5.82 9.88V7.02H2.13C1.37 8.53 0.94 10.22 0.94 12C0.94 13.78 1.37 15.47 2.13 16.98L5.82 14.12Z" fill="#FBBC05"/>
              <path d="M12 5.38C13.62 5.38 15.06 5.93 16.21 7.02L19.35 3.88C17.46 2.12 14.97 1 12 1C7.7 1 3.96 3.39 2.13 7.02L5.82 9.88C6.71 7.3 9.14 5.38 12 5.38Z" fill="#EA4335"/>
            </svg>
            Continuar con Google
          </button>

          {/*  DIVISOR VISUAL */}
          <div className="flex items-center my-6">
            <div className="flex-grow border-t border-[#444444]"></div>
            <span className="mx-4 text-slate-500 text-sm">O</span>
            <div className="flex-grow border-t border-[#444444]"></div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <div className="relative group">
                <input 
                  type="email" 
                  className="w-full px-4 py-3 bg-[#2A2A2A] border border-[#444444] rounded-xl focus:ring-1 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-white placeholder-slate-400"
                  placeholder="Ingresa tu correo electrónico"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <div className="relative group">
                <input 
                  type="password" 
                  className="w-full px-4 py-3 bg-[#2A2A2A] border border-[#444444] rounded-xl focus:ring-1 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-white placeholder-slate-400"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full bg-[#EFEFEF] hover:bg-white text-slate-900 font-bold py-3.5 rounded-xl transition-all"
            >
              Continuar con correo electrónico
            </button>
          </form>
          
          <div className="mt-6 text-center text-xs text-slate-500">
            Al continuar, reconoces la <a href="#" className="underline">Política de Privacidad</a> del complejo.
          </div>

        </div>
      </div>
    </div>
  );
}