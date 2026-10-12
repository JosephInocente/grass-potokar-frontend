import React, { createContext, useState, useEffect } from 'react';

export const SedeContext = createContext();

export const SedeProvider = ({ children }) => {
  const [sedeActiva, setSedeActiva] = useState(() => {
    const rol = localStorage.getItem('rol');
    const idSedeUsuario = localStorage.getItem('idSede');

    //  ARQUITECTURA: Si es un Cajero (ADMIN), su sede activa SIEMPRE es su sede asignada
    if (rol === 'ADMIN' && idSedeUsuario) {
      return idSedeUsuario;
    }

    return localStorage.getItem('sedeActiva') || 'GLOBAL';
  });

  const cambiarSede = (idSede) => {
    setSedeActiva(idSede);
    localStorage.setItem('sedeActiva', idSede); 
  };

  return (
    <SedeContext.Provider value={{ sedeActiva, cambiarSede }}>
      {children}
    </SedeContext.Provider>
  );
};