import { Routes, Route, Navigate } from 'react-router-dom';
import { SedeProvider } from './context/SedeContext'; 

// MÓDULO AUTH 
import Login from './features/auth/pages/Login';
import Registro from './features/auth/pages/Registro';

// PERFIL
import MiPerfil from './features/perfil/pages/MiPerfil';

// MÓDULO DASHBOARD
import Dashboard from './features/dashboard/pages/Dashboard';

// MÓDULO PORTAL CLIENTE
import CatalogoCliente from './features/portal_cliente/pages/CatalogoCliente';
import MisReservas from './features/portal_cliente/pages/MisReservas';

// MÓDULO RESERVAS
import NuevaReserva from './features/reservas/pages/NuevaReserva'; 
import GestionReservas from './features/reservas/pages/GestionReservas';

// MÓDULO ADMINISTRACIÓN
import GestionCanchas from './features/administracion/pages/GestionCanchas';
import GestionSedes from './features/administracion/pages/GestionSedes';
import GestionPersonal from './features/administracion/pages/GestionPersonal';

// MÓDULOS INDEPENDIENTES
import GestionClientes from './features/clientes/pages/GestionClientes';
import GestionVentas from './features/pos/pages/GestionVentas';
import GestionReportes from './features/reportes/pages/GestionReportes';

import HistorialCajas from './features/finanzas/pages/HistorialCajas';

function App() {
  return (
    <SedeProvider>
      <Routes>
        {/*  AHORA LA RUTA RAÍZ MANDA AL CATÁLOGO (PÚBLICO) */}
        <Route path="/" element={<Navigate to="/catalogo" replace />} />
        
        {/* Rutas principales del sistema */}
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Rutas del Cliente */}
        <Route path="/catalogo" element={<CatalogoCliente />} />
        <Route path="/reservas" element={<NuevaReserva />} /> 
        <Route path="/mis-reservas" element={<MisReservas />} />
        
        {/* Rutas del Administrador */}
        <Route path="/admin/reservas" element={<GestionReservas />} />
        <Route path="/admin/canchas" element={<GestionCanchas />} />
        <Route path="/admin/sedes" element={<GestionSedes />} />
        <Route path="/admin/personal" element={<GestionPersonal />} />
        <Route path="/admin/clientes" element={<GestionClientes />} />
        <Route path="/admin/pagos" element={<GestionVentas />} />
        <Route path="/admin/reportes" element={<GestionReportes />} />
        <Route path="/admin/perfil" element={<MiPerfil />} />
        <Route path="/admin/historial-cajas" element={<HistorialCajas />} />

      </Routes>
    </SedeProvider>
  );
}

export default App;