import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, CalendarDays, MapPin, Users, 
  LogOut, CreditCard, UserCircle, BarChart3, Briefcase, Building2, ClipboardList, LayoutGrid
} from 'lucide-react';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation(); 
  
  // Obtenemos el rol directamente del localStorage
  const rol = localStorage.getItem('rol');
  const isSuperAdmin = rol === 'SUPER_ADMIN';

  const cerrarSesion = () => {
    localStorage.clear();
    navigate('/login');
  };

  const isActive = (path) => {
    // Usamos startsWith para mantener el active state si hay sub-rutas
    return location.pathname.startsWith(path)
      ? 'bg-[#1A241F] text-[#00C193] border-r-4 border-[#00C193]' 
      : 'text-slate-400 hover:bg-[#151D19] hover:text-white border-r-4 border-transparent';
  };

  return (
    <aside className="w-64 bg-[#0B110E] flex flex-col justify-between hidden md:flex h-screen sticky top-0 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.1)] z-50">
      <div className="flex flex-col h-full overflow-hidden">
        
        <div className="p-6 flex items-center gap-3 border-b border-white/5 shrink-0 mt-2">
          <div className="bg-[#00C193] p-2.5 rounded-xl shadow-[0_0_15px_rgba(0,193,147,0.4)]">
            <MapPin className="text-white w-6 h-6" />
          </div>
          <div>
             <span className="text-xl font-black text-white tracking-tight block leading-none">Grass</span>
             <span className="text-sm font-bold text-[#00C193] tracking-widest uppercase">POTOKAR</span>
          </div>
        </div>

        <div className="px-6 py-4">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Navegación</p>
        </div>

        <nav className="space-y-1 overflow-y-auto custom-scrollbar flex-1 pl-4 pr-0">
          
          {/* VISTAS COMPARTIDAS (ADMIN Y SUPER_ADMIN) */}
          <button onClick={() => navigate('/dashboard')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-l-xl transition-all font-bold text-sm ${isActive('/dashboard')}`}>
            <LayoutDashboard className="w-5 h-5" /> Dashboard
          </button>
          
          <button onClick={() => navigate('/admin/reservas')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-l-xl transition-all font-bold text-sm ${isActive('/admin/reservas')}`}>
            <CalendarDays className="w-5 h-5" /> Reservas
          </button>

          <button onClick={() => navigate('/admin/pagos')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-l-xl transition-all font-bold text-sm ${isActive('/admin/pagos')}`}>
            <CreditCard className="w-5 h-5" /> Pagos (POS)
          </button>

          {/* VISTAS EXCLUSIVAS (SOLO SUPER_ADMIN) */}
          {isSuperAdmin && (
            <>
              <div className="pt-4 mt-2 mb-2 pr-4">
                <div className="h-px w-full bg-white/5"></div>
              </div>
              <div className="px-2 py-2 mb-1">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Administración</p>
              </div>

              <button onClick={() => navigate('/admin/sedes')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-l-xl transition-all font-bold text-sm ${isActive('/admin/sedes')}`}>
                <Building2 className="w-5 h-5" /> Sedes
              </button>
              
              {/* 🟢 AQUÍ RESTAURAMOS EL BOTÓN DE CANCHAS */}
              <button onClick={() => navigate('/admin/canchas')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-l-xl transition-all font-bold text-sm ${isActive('/admin/canchas')}`}>
                <LayoutGrid className="w-5 h-5" /> Canchas
              </button>

              <button onClick={() => navigate('/admin/personal')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-l-xl transition-all font-bold text-sm ${isActive('/admin/personal')}`}>
                <Briefcase className="w-5 h-5" /> Personal
              </button>

              <button onClick={() => navigate('/admin/clientes')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-l-xl transition-all font-bold text-sm ${isActive('/admin/clientes')}`}>
                <Users className="w-5 h-5" /> Clientes
              </button>

              <button onClick={() => navigate('/admin/reportes')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-l-xl transition-all font-bold text-sm ${isActive('/admin/reportes')}`}>
                <BarChart3 className="w-5 h-5" /> Reportes
              </button>

              {/* Auditoría de Cajas (finanzas) */}
              <button onClick={() => navigate('/admin/historial-cajas')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-l-xl transition-all font-bold text-sm ${isActive('/admin/historial-cajas')}`}>
                <ClipboardList className="w-5 h-5" /> Auditoría de Cajas
              </button>
            </>
          )}

          <div className="pt-4 mt-2 mb-2 pr-4">
            <div className="h-px w-full bg-white/5"></div>
          </div>
          
          {/* Perfil visible para todos */}
          <button onClick={() => navigate('/admin/perfil')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-l-xl transition-all font-bold text-sm ${isActive('/admin/perfil')}`}>
            <UserCircle className="w-5 h-5" /> Mi Perfil
          </button>
        </nav>
      </div>

      <div className="p-6 border-t border-white/5 shrink-0">
        <button onClick={cerrarSesion} className="w-full flex items-center gap-3 text-slate-400 hover:text-red-400 font-bold text-sm transition-colors group">
          <div className="bg-white/5 p-2 rounded-lg group-hover:bg-red-400/10">
            <LogOut className="w-4 h-4" />
          </div>
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}