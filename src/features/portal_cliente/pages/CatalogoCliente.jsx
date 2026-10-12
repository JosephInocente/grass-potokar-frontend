import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogOut, Sun, Moon, Target, Maximize, Calendar, Image as ImageIcon } from 'lucide-react';
import axios from 'axios';

export default function CatalogoCliente() {
  const [canchas, setCanchas] = useState([]);
  const [reservas, setReservas] = useState([]);
  const navigate = useNavigate();
  
  const token = localStorage.getItem('token');
  const nombreUsuario = localStorage.getItem('nombre') || 'Usuario';

  useEffect(() => {
    // 🟢 ELIMINAMOS la redirección obligatoria al login. Ahora es público.
    cargarDatos();
    
    const intervalo = setInterval(() => {
        setCanchas(prev => [...prev]); 
    }, 60000); 
    return () => clearInterval(intervalo);
  }, [token]); // Agregamos dependencias correctas

  const cargarDatos = async () => {
    try {
      // 🟢 CONFIGURACIÓN INTELIGENTE: Si hay token, lo manda. Si no, va vacío para que sea público.
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      
      const [resCanchas, resReservas] = await Promise.all([
        axios.get('http://localhost:8080/api/canchas', config),
        // Las reservas del cliente solo se piden si está logueado, sino devolvemos array vacío
        token ? axios.get('http://localhost:8080/api/reservas', config) : Promise.resolve({ data: [] })
      ]);
      
      setCanchas(resCanchas.data);
      setReservas(resReservas.data);
    } catch (error) { 
      console.error("Error al cargar datos:", error); 
    }
  };

  const cerrarSesion = () => {
    localStorage.clear();
    // 🟢 Al cerrar sesión, lo dejamos en el mismo catálogo pero ahora como visitante
    navigate('/catalogo');
    window.location.reload(); // Forzamos recarga para limpiar estado
  };

  const obtenerEstadoVisual = (cancha) => {
    let estadoActual = cancha.estado;
    
    if (estadoActual === 'Disponible') {
        const ahora = new Date();
        const reservaEnCurso = reservas.find(r => {
            if (r.cancha?.idCancha !== cancha.idCancha || r.estado !== 'Confirmada') return false;
            const inicio = new Date(r.horaInicio);
            const fin = new Date(r.horaFin);
            return ahora >= inicio && ahora < fin;
        });
        if (reservaEnCurso) estadoActual = 'En uso';
    }

    let colorClase = '';
    switch (estadoActual) {
        case 'Disponible': colorClase = 'bg-[#EAF9F1] text-[#2DBC73]'; break; 
        case 'En uso': colorClase = 'bg-blue-50 text-blue-600 animate-pulse border border-blue-100'; break;
        case 'Mantenimiento': colorClase = 'bg-yellow-50 text-yellow-600'; break;
        case 'Inactiva': colorClase = 'bg-red-50 text-red-600'; break;
        default: colorClase = 'bg-slate-100 text-slate-600';
    }

    return { texto: estadoActual, clase: colorClase };
  };

  const irAComplejos = () => {
    document.getElementById('seccion-canchas').scrollIntoView({ behavior: 'smooth' });
  };

  // Función para manejar intentos de reserva de usuarios no logueados
  const handleReservarClick = (idCancha) => {
    if (token) {
      navigate('/reservas', { state: { idCancha } });
    } else {
      navigate('/login'); // Si no está logueado, lo mandamos a login
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans">
      
      {/* NAVBAR */}
      <nav className="bg-white px-8 py-4 shadow-sm flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-3">
            <div className="bg-[#00C193] p-2 rounded-xl">
                <Target className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Canchas Online</h1>
        </div>
        
        <div className="flex items-center gap-4 md:gap-6">
          
          {/* 🟢 RENDERIZADO CONDICIONAL EN CABECERA */}
          {token ? (
            <>
              <button 
                onClick={() => navigate('/mis-reservas')}
                className="flex items-center gap-2 text-slate-600 hover:text-[#00C193] font-bold text-sm transition-colors"
              >
                <Calendar className="w-5 h-5 text-[#00C193]" />
                <span className="hidden sm:inline">Mis Reservas</span>
              </button>

              <div className="hidden md:block w-px h-8 bg-slate-200"></div>

              <div className="flex flex-col items-end hidden md:flex">
                <span className="text-xs text-slate-400 font-bold uppercase">Bienvenido</span>
                <span className="font-bold text-slate-700">Hola, {nombreUsuario}</span>
              </div>
              
              <button 
                onClick={cerrarSesion} 
                className="flex items-center gap-2 text-slate-400 hover:text-red-500 font-bold text-sm transition-colors border-l border-slate-200 pl-4 md:pl-6"
              >
                <LogOut className="w-5 h-5" /> 
                <span className="hidden sm:inline">Cerrar sesión</span>
              </button>
            </>
          ) : (
            <Link 
              to="/login" 
              className="bg-[#00C193] hover:bg-[#00A880] text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-[#00C193]/30"
            >
              Iniciar Sesión
            </Link>
          )}
        </div>
      </nav>

      {/* HERO BANNER */}
      <div className="bg-[#E6F7F4] rounded-b-[4rem] px-8 py-16 md:py-24 mb-12 relative">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
          
          <div className="flex flex-col justify-center text-center md:text-left">
            <h2 className="text-4xl md:text-5xl font-black text-slate-800 mb-4 leading-tight">
              Vive la pasión de <br/><span className="text-[#00C193]">tus partidos</span>
            </h2>
            <p className="text-slate-600 mb-8 text-lg max-w-md mx-auto md:mx-0">
              Sistema completo de reservas online para complejos deportivos. Disfruta de la mejor experiencia y canchas de alta calidad.
            </p>
            <div>
              <button className="bg-[#00C193] hover:bg-[#00A880] text-white font-bold py-3.5 px-8 rounded-xl transition-all shadow-lg shadow-[#00C193]/30">
                Solicitar información
              </button>
            </div>
          </div>

          <div className="flex flex-col justify-center md:border-l-2 border-[#00C193]/20 md:pl-12 text-center md:text-left pt-10 md:pt-0 border-t-2 md:border-t-0 mt-10 md:mt-0">
            <h2 className="text-4xl md:text-5xl font-black text-slate-800 mb-4 leading-tight">
              Quiero <span className="text-[#00C193]">reservar una cancha</span>
            </h2>
            <p className="text-slate-600 mb-8 text-lg max-w-md mx-auto md:mx-0">
              Conoce los complejos, revisa los horarios disponibles y reserva tu cancha en minutos sin complicaciones.
            </p>
            <div>
              <button 
                onClick={irAComplejos}
                className="bg-[#00C193] hover:bg-[#00A880] text-white font-bold py-3.5 px-8 rounded-xl transition-all shadow-lg shadow-[#00C193]/30"
              >
                Ver complejos
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* SECCIÓN DE CANCHAS */}
      <main id="seccion-canchas" className="max-w-7xl mx-auto p-8 pt-4">
        
        <div className="mb-10 flex items-center justify-between">
            <h3 className="text-2xl font-black text-slate-800">Canchas Disponibles</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 pb-16">
          {canchas.map(cancha => {
            const estadoVisual = obtenerEstadoVisual(cancha);
            const sePuedeReservar = cancha.estado === 'Disponible';

            return (
              <div key={cancha.idCancha} className="bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden flex flex-col hover:shadow-xl transition-all duration-500">
                
                <div className="h-52 w-full bg-slate-100 relative">
                  {cancha.urlImagen ? (
                    <img src={cancha.urlImagen} alt={cancha.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <ImageIcon className="w-10 h-10" />
                    </div>
                  )}
                </div>

                <div className="p-7 flex-1 flex flex-col">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{cancha.nombre}</h2>
                    <span className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest ${estadoVisual.clase}`}>
                      {estadoVisual.texto}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-[#FFF9F2] border border-[#FFF0E0] rounded-3xl p-5 flex flex-col items-center relative overflow-hidden">
                      <Sun className="w-7 h-7 text-[#FFD1A6] absolute -bottom-1 -left-1 opacity-40 rotate-12" />
                      <span className="text-[10px] font-black text-[#FF6B00] mb-1 tracking-tighter">DÍA</span>
                      <span className="text-2xl font-black text-slate-800">S/ {cancha.precioDia}</span>
                    </div>
                    
                    <div className="bg-[#F5F7FF] border border-[#EBEFFF] rounded-3xl p-5 flex flex-col items-center relative overflow-hidden">
                      <Moon className="w-7 h-7 text-[#C2D0FF] absolute -bottom-1 -left-1 opacity-40 -rotate-12" />
                      <span className="text-[10px] font-black text-[#4B3BFF] mb-1 tracking-tighter">NOCHE</span>
                      <span className="text-2xl font-black text-slate-800">S/ {cancha.precioNoche}</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-5 flex justify-between items-center text-slate-400 font-bold text-sm mb-8">
                    <div className="flex items-center gap-2">
                      <div className="bg-green-50 p-1.5 rounded-full"><Target className="w-4 h-4 text-[#2DBC73]" /></div>
                      {cancha.tipoGrass}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="bg-blue-50 p-1.5 rounded-full"><Maximize className="w-4 h-4 text-[#5C7CFA]" /></div>
                      {cancha.medidas}
                    </div>
                  </div>

                  <button 
                    disabled={!sePuedeReservar}
                    onClick={() => handleReservarClick(cancha.idCancha)}
                    className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
                        sePuedeReservar 
                        ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-200' 
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {sePuedeReservar ? 'Reservar Ahora' : 'Cancha Ocupada'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}