import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080/api', // Ajusta el puerto si tu Spring Boot usa otro
  headers: {
    'Content-Type': 'application/json',
  }
});

// Interceptor de Peticiones: Inyectar el JWT automáticamente
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de Respuestas: Manejo global de errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status } = error.response;
      
      if (status === 401) {
        // Token inválido/expirado: Limpiar sesión y expulsar al login
        localStorage.clear();
        window.location.href = '/login'; 
      } else if (status === 403) {
        // Multitenant/Roles: Intento de acceso a un recurso prohibido
        alert('Acceso denegado: No tienes los permisos necesarios.');
      } else if (status >= 500) {
        // Fallo en Spring Boot
        alert('Error interno del servidor. Por favor, intenta de nuevo más tarde.');
      }
    } else if (error.request) {
      // Backend apagado o error de red CORS
      alert('No se pudo conectar con el servidor. Verifica que el backend esté encendido.');
    }

    return Promise.reject(error);
  }
);

export default api;