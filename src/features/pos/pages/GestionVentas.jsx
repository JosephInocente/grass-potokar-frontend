import React, { useEffect, useState, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CreditCard, ShoppingCart, 
  Coffee, Plus, Minus, Trash2, CheckCircle, XCircle, 
  Package, Search, ScanLine, X, FileText, Printer, FileOutput, Loader2,
  Eye, Wallet, Smartphone, ShieldAlert, ArrowRight, Save, PlusCircle,
  ChevronLeft, ChevronRight, Download, Filter, Store
} from 'lucide-react';

import { jsPDF } from "jspdf"; 
import autoTable from 'jspdf-autotable'; 

import { SedeContext } from '../../../context/SedeContext';
import api from '../../../api/axiosConfig';
import Sidebar from '../../../components/Sidebar';

export default function GestionVentas() {
  const navigate = useNavigate();
  const rol = localStorage.getItem('rol');
  const idSede = localStorage.getItem('idSede');

  const { sedeActiva } = useContext(SedeContext);

  const [productos, setProductos] = useState([]);
  const [ventasHistorial, setVentasHistorial] = useState([]);
  const [showPOS, setShowPOS] = useState(false);
  const [showInventario, setShowInventario] = useState(false);
  const [showConfirmacion, setShowConfirmacion] = useState(false); 
  
  const [showGlobalBlockModal, setShowGlobalBlockModal] = useState(false);
  
  const [paginaActual, setPaginaActual] = useState(1);
  const elementosPorPagina = 10;
  const [filtroTiempo, setFiltroTiempo] = useState('Hoy'); 
  
  const [carrito, setCarrito] = useState([]);
  const [busquedaPOS, setBusquedaPOS] = useState(''); 
  
  const [tipoComprobante, setTipoComprobante] = useState('Boleta Simple'); 
  const [docCliente, setDocCliente] = useState('00000000');
  const [nombreCliente, setNombreCliente] = useState('Clientes Varios');
  const [buscandoDoc, setBuscandoDoc] = useState(false); 
  
  const [metodoPago, setMetodoPago] = useState('Efectivo'); 
  const [ticketGenerado, setTicketGenerado] = useState(null);
  const [mensajeFlotante, setMensajeFlotante] = useState({ visible: false, texto: '', tipo: 'success' });

  const [modoInventario, setModoInventario] = useState('CREAR'); 
  const [productoSeleccionado, setProductoSeleccionado] = useState(null); 
  const [formProducto, setFormProducto] = useState({ nombre: '', precio: '', stock: '', categoria: 'Snacks' });
  const [pasoInventario, setPasoInventario] = useState(1);
  const [codigosEscaneados, setCodigosEscaneados] = useState([]);
  const [codigoActual, setCodigoActual] = useState('');
  const inputScannerRef = useRef(null);

  const stockDeseado = parseInt(formProducto.stock) || 0;
  const escaneoCompleto = codigosEscaneados.length >= stockDeseado;

  useEffect(() => {
    if (rol !== 'ADMIN' && rol !== 'SUPER_ADMIN') { navigate('/catalogo'); return; }
    cargarProductos();
    cargarHistorialVentas();
    // eslint-disable-next-line
  }, [rol, navigate, sedeActiva]);

  useEffect(() => {
    if (pasoInventario === 2) {
        setTimeout(() => {
            if (inputScannerRef.current) inputScannerRef.current.focus();
        }, 100);
    }
  }, [pasoInventario]);

  const getConfigHeader = () => {
    const idSedeAUsar = rol === 'SUPER_ADMIN' ? (sedeActiva || 'GLOBAL') : idSede;
    return { headers: { 'X-Sede-Activa': idSedeAUsar } };
  };

  const cargarProductos = async () => {
    try {
      const res = await api.get('/productos', getConfigHeader());
      let productosData = res.data;
      
      const idSedeAUsar = rol === 'SUPER_ADMIN' ? sedeActiva : idSede;
      if (idSedeAUsar && idSedeAUsar !== 'GLOBAL') {
          productosData = productosData.filter(p => !p.sede || String(p.sede.idSede) === String(idSedeAUsar));
      }
      
      setProductos(productosData);
    } catch (error) { console.error(error); }
  };

  const cargarHistorialVentas = async () => {
    try {
      const res = await api.get('/ventas', getConfigHeader());
      let ventasData = res.data;

      const idSedeAUsar = rol === 'SUPER_ADMIN' ? sedeActiva : idSede;
      if (idSedeAUsar && idSedeAUsar !== 'GLOBAL') {
          ventasData = ventasData.filter(v => !v.sede || String(v.sede.idSede) === String(idSedeAUsar));
      }

      const ventasOrdenadas = ventasData.sort((a, b) => new Date(b.fechaVenta) - new Date(a.fechaVenta));
      setVentasHistorial(ventasOrdenadas);
    } catch (error) { console.error(error); }
  };

  const mostrarMensaje = (texto, tipo = 'success') => {
    setMensajeFlotante({ visible: true, texto, tipo });
    setTimeout(() => setMensajeFlotante(prev => ({ ...prev, visible: false })), 3500);
  };

  const consultarDocumento = async () => {
    if (!docCliente) return;
    setBuscandoDoc(true);
    setNombreCliente(''); 

    try {
      let url = tipoComprobante === 'Boleta' ? `/consultas/dni/${docCliente}` : `/consultas/ruc/${docCliente}`;
      const res = await api.get(url);
      
      let data = res.data;
      if (typeof data === 'string') { try { data = JSON.parse(data); } catch (e) {} }
      const info = data.data ? data.data : data;
      let nombreExtraido = '';

      if (tipoComprobante === 'Boleta') {
        if (info.full_name) nombreExtraido = info.full_name;
        else nombreExtraido = `${info.first_name || info.nombres || ''} ${info.first_last_name || info.apellido_paterno || ''} ${info.second_last_name || info.apellido_materno || ''}`.trim();
      } else {
        nombreExtraido = info.company_name || info.razonSocial || info.razon_social || info.nombre || '';
      }
      
      if (nombreExtraido) {
        setNombreCliente(nombreExtraido);
        mostrarMensaje('Cliente encontrado', 'success');
      } else {
        mostrarMensaje('Escribe el nombre manualmente', 'error');
      }
    } catch (error) {
      mostrarMensaje('Documento no encontrado', 'error');
    } finally {
      setBuscandoDoc(false);
    }
  };

  const prepararReabastecimiento = (producto) => {
      setModoInventario('AUMENTAR');
      setProductoSeleccionado(producto.idProducto);
      setFormProducto({ 
          nombre: producto.nombre, 
          precio: producto.precio, 
          stock: '', 
          categoria: producto.categoria 
      });
      setCodigosEscaneados([]);
      setPasoInventario(1);
  };

  const handleContinuarPaso2 = (e) => {
      e.preventDefault();
      if (stockDeseado > 0) {
          setPasoInventario(2);
      } else {
          mostrarMensaje('La cantidad debe ser mayor a 0', 'error');
      }
  };

  const handleEscanearNuevoCodigo = (e) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          if (!codigoActual.trim()) return;
          
          const nuevosCodigos = [...codigosEscaneados, codigoActual.trim()];
          setCodigosEscaneados(nuevosCodigos);
          setCodigoActual(''); 
          
          if (nuevosCodigos.length >= stockDeseado) {
              mostrarMensaje('¡Todos los códigos escaneados!', 'success');
          }
      }
  };

  const handleAgregarInventarioFinal = async () => {
    try {
      const idSedeFinal = rol === 'SUPER_ADMIN' ? sedeActiva : idSede;

      if (modoInventario === 'CREAR') {
          const nuevoProducto = { 
              ...formProducto, 
              precio: parseFloat(formProducto.precio), 
              stock: stockDeseado,
              // CORRECCIÓN: Quitamos el JSON.stringify. Enviamos el arreglo puro.
              codigosVariantes: codigosEscaneados, 
              codigo: codigosEscaneados[0] || 'SIN-CODIGO',
              sede: { idSede: parseInt(idSedeFinal) }
          };
          await api.post('/productos', nuevoProducto, getConfigHeader());
          mostrarMensaje('¡Producto nuevo registrado!', 'success');
      } else {
          await api.put(`/productos/${productoSeleccionado}/stock`, { nuevosCodigos: codigosEscaneados }, getConfigHeader());
          mostrarMensaje('¡Stock aumentado exitosamente!', 'success');
      }
      
      cerrarModalInventario();
      cargarProductos();
      
    } catch (error) { 
        mostrarMensaje('Error al guardar en Base de Datos', 'error'); 
        console.error("Detalle del error:", error.response?.data); // Para ver detalles en consola
    }
  };

  const cerrarModalInventario = () => {
      setShowInventario(false);
      setModoInventario('CREAR');
      setProductoSeleccionado(null);
      setFormProducto({ nombre: '', precio: '', stock: '', categoria: 'Snacks' });
      setCodigosEscaneados([]);
      setCodigoActual('');
      setPasoInventario(1);
  };

  const volverAModoCrear = () => {
      setModoInventario('CREAR');
      setProductoSeleccionado(null);
      setFormProducto({ nombre: '', precio: '', stock: '', categoria: 'Snacks' });
      setPasoInventario(1);
      setCodigosEscaneados([]);
  };

  const handleAbrirInventario = () => {
    if (sedeActiva === 'GLOBAL') {
      setShowGlobalBlockModal(true);
    } else {
      setShowInventario(true);
    }
  };

  const handleAbrirPOS = () => {
    if (sedeActiva === 'GLOBAL') {
      setShowGlobalBlockModal(true);
    } else {
      setShowPOS(true);
    }
  };

  const procesarVenta = async () => {
    setShowConfirmacion(false); 
    const sedeFinal = (rol === 'SUPER_ADMIN' && sedeActiva !== 'GLOBAL') ? sedeActiva : idSede;

    const payloadVenta = {
      total: totalCarrito,
      tipoComprobante: tipoComprobante === 'Boleta Simple' ? 'Boleta' : tipoComprobante,
      documentoCliente: docCliente || '00000000',
      nombreCliente: nombreCliente || 'Cliente General',
      metodoPago: metodoPago, 
      sede: { idSede: parseInt(sedeFinal) },
      detalles: carrito.map(item => ({
        producto: { idProducto: item.idProducto },
        cantidad: item.cantidad,
        precioUnitario: item.precio,
        subtotal: item.precio * item.cantidad
      }))
    };

    try {
      const res = await api.post('/ventas', payloadVenta, getConfigHeader());
      const nuevoTicket = {
        idVenta: res.data.idVenta || '0001',
        fecha: new Date().toLocaleString('es-PE'),
        tipo: tipoComprobante === 'Boleta Simple' ? 'Boleta' : tipoComprobante,
        documento: docCliente || '00000000',
        cliente: nombreCliente || 'Cliente General',
        metodoPago: metodoPago, 
        items: [...carrito],
        total: totalCarrito
      };

      setTicketGenerado(nuevoTicket); 
      setCarrito([]); 
      setTipoComprobante('Boleta Simple');
      setDocCliente('00000000');
      setNombreCliente('Clientes Varios');
      setMetodoPago('Efectivo'); 
      setShowPOS(false); 
      cargarProductos(); 
      cargarHistorialVentas(); 

      mostrarMensaje('Venta registrada exitosamente', 'success');
    } catch (error) {
      mostrarMensaje(error.response?.data?.message || 'Error al procesar la venta. Revisa el stock.', 'error');
    }
  };

  const verTicketHistorico = (venta) => {
    const ticketRestaurado = {
      idVenta: venta.idVenta,
      fecha: new Date(venta.fechaVenta).toLocaleString('es-PE'),
      tipo: venta.tipoComprobante || 'Boleta',
      documento: venta.documentoCliente || '00000000',
      cliente: venta.nombreCliente || 'Cliente General',
      metodoPago: venta.metodoPago || 'Efectivo',
      items: venta.detalles.map(d => ({
        nombre: d.nombreProducto,
        cantidad: d.cantidad,
        precio: d.precioUnitario
      })),
      total: venta.total
    };
    setTicketGenerado(ticketRestaurado);
  };

  const agregarAlCarrito = (producto) => {
    if (producto.stock <= 0) { mostrarMensaje('Producto sin stock', 'error'); return; }
    const existe = carrito.find(item => item.idProducto === producto.idProducto);
    if (existe) {
      if (existe.cantidad >= producto.stock) { mostrarMensaje('Límite de stock', 'error'); return; }
      setCarrito(carrito.map(item => item.idProducto === producto.idProducto ? { ...item, cantidad: item.cantidad + 1 } : item));
    } else {
      setCarrito([...carrito, { ...producto, cantidad: 1 }]);
    }
  };

  const quitarDelCarrito = (idProducto) => {
    const existe = carrito.find(item => item.idProducto === idProducto);
    if (existe.cantidad === 1) setCarrito(carrito.filter(item => item.idProducto !== idProducto));
    else setCarrito(carrito.map(item => item.idProducto === idProducto ? { ...item, cantidad: item.cantidad - 1 } : item));
  };

  const totalCarrito = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

  const handleEscanerPOS = (e) => {
    if (e.key === 'Enter') {
      const busqueda = busquedaPOS.toLowerCase().trim();
      
      const prod = productos.find(p => {
          if (p.codigo.toLowerCase() === busqueda) return true;
          if (p.codigosVariantes) {
              try {
                  const variantes = JSON.parse(p.codigosVariantes);
                  if (variantes.includes(busqueda)) return true;
              } catch(err) {}
          }
          return false;
      });

      if (prod) { 
          agregarAlCarrito(prod); 
          setBusquedaPOS(''); 
      } else {
          mostrarMensaje('Producto no encontrado en inventario', 'error');
      }
    }
  };

  // 🟢 CORRECCIÓN: Filtros de fecha reescritos para evitar desfases de zona horaria
  const obtenerVentasFiltradasPorTiempo = () => {
    const ahora = new Date();
    
    // Obtenemos la fecha local exacta YYYY-MM-DD
    const year = ahora.getFullYear();
    const month = String(ahora.getMonth() + 1).padStart(2, '0');
    const day = String(ahora.getDate()).padStart(2, '0');
    const hoyStr = `${year}-${month}-${day}`;

    return ventasHistorial.filter(venta => {
      const fechaString = venta.fechaVenta || venta.fecha || venta.fechaCreacion;
      if (!fechaString) return false;
      
      // Extraemos la fecha directamente del string (ej: "2026-05-22")
      const fechaExtraida = String(fechaString).split('T')[0].split(' ')[0];
      
      if (filtroTiempo === 'Hoy') {
        return fechaExtraida === hoyStr;
      } else if (filtroTiempo === 'Esta Semana') {
        const fechaVenta = new Date(fechaString);
        const hace7Dias = new Date();
        hace7Dias.setDate(ahora.getDate() - 7);
        return fechaVenta >= hace7Dias;
      } else if (filtroTiempo === 'Este Mes') {
        return fechaExtraida.startsWith(`${year}-${month}`);
      } else if (filtroTiempo === 'Este Año') {
        return fechaExtraida.startsWith(`${year}`);
      }
      return true; 
    });
  };

  const ventasParaMostrar = obtenerVentasFiltradasPorTiempo();

  const exportarPDF = () => {
    try {
      if (!ventasParaMostrar || ventasParaMostrar.length === 0) {
        alert("No hay ventas para exportar con este filtro.");
        return;
      }

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.setTextColor(0, 193, 147);
      doc.text(`Reporte de Ventas - ${filtroTiempo}`, 14, 22);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 30);

      const tableData = ventasParaMostrar.map(v => {
        const fecha = v.fechaVenta ? new Date(v.fechaVenta).toLocaleDateString() : 'N/A';
        const hora = v.fechaVenta ? new Date(v.fechaVenta).toLocaleTimeString() : 'N/A';
        return [
          fecha,
          hora,
          v.nombreCliente || 'Sin nombre',
          v.metodoPago || 'Efectivo',
          `S/ ${v.total ? v.total.toFixed(2) : '0.00'}`
        ];
      });

      autoTable(doc, { 
        startY: 35,
        head: [['Fecha', 'Hora', 'Cliente', 'Pago', 'Total']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [0, 193, 147] }
      });

      doc.save(`Reporte_Ventas_${filtroTiempo}.pdf`);
    } catch (error) {
      console.error("Error crítico al generar PDF:", error);
      alert("Hubo un error al generar el PDF.");
    }
  };

  const totalPaginas = Math.ceil(ventasParaMostrar.length / elementosPorPagina);
  const indiceUltimoElemento = paginaActual * elementosPorPagina;
  const indicePrimerElemento = indiceUltimoElemento - elementosPorPagina;
  const ventasPaginadas = ventasParaMostrar.slice(indicePrimerElemento, indiceUltimoElemento);

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
      
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative p-4 md:p-8">
        
        <div className="print:hidden flex flex-col flex-1">
          
          <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl font-bold text-sm ${
              mensajeFlotante.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'
            } ${mensajeFlotante.tipo === 'success' ? 'bg-[#00C193] text-white' : 'bg-red-500 text-white'}`}
          >
            {mensajeFlotante.tipo === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            {mensajeFlotante.texto}
          </div>

          <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-[#E6F7F4] p-3 rounded-xl shadow-sm">
                <ShoppingCart className="text-[#00C193] w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-800">Pagos y Tienda</h1>
                <p className="text-sm text-slate-500 font-medium mt-1">Registra cobros y vende productos extras</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
              <button onClick={handleAbrirInventario} className="bg-slate-100 text-slate-700 font-bold py-3 px-6 rounded-xl hover:bg-slate-200 transition-all flex items-center gap-2 justify-center">
                <Package className="w-5 h-5" /> Gestión de Inventario
              </button>
              <button onClick={handleAbrirPOS} className="bg-[#00C193] text-white font-bold py-3 px-6 rounded-xl hover:bg-[#00A880] transition-all shadow-lg shadow-[#00C193]/30 flex items-center gap-2 justify-center">
                <CreditCard className="w-5 h-5" /> Abrir Caja Registradora
              </button>
            </div>
          </header>

          <div className="bg-white rounded-[2rem] p-0 shadow-sm border border-slate-100 mb-10 overflow-hidden flex flex-col flex-1">
            <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <FileText className="w-6 h-6 text-[#00C193]" /> Historial de Ventas
              </h3>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select 
                    className="w-full sm:w-auto pl-9 pr-8 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl outline-none focus:border-[#00C193] font-bold text-slate-600 text-sm appearance-none cursor-pointer"
                    value={filtroTiempo}
                    onChange={(e) => {
                      setFiltroTiempo(e.target.value);
                      setPaginaActual(1); 
                    }}
                  >
                    <option value="Hoy">Solo Hoy</option>
                    <option value="Esta Semana">Esta Semana</option>
                    <option value="Este Mes">Este Mes</option>
                    <option value="Este Año">Este Año</option>
                    <option value="Todo">Todo el Historial</option>
                  </select>
                </div>
                
                <button 
                  onClick={exportarPDF}
                  disabled={ventasParaMostrar.length === 0}
                  className="flex items-center justify-center gap-2 bg-slate-800 text-white font-bold text-sm py-2.5 px-5 rounded-xl hover:bg-slate-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <Download className="w-4 h-4" /> Exportar PDF
                </button>
              </div>
            </div>
            
            {ventasHistorial.length === 0 ? (
              <div className="p-8">
                <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-2xl">
                  <FileText className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                  <p className="text-slate-400 font-medium">Aún no hay ventas registradas. Abre la caja para comenzar.</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col flex-1 justify-between">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest border-b border-slate-100">
                      <tr>
                        <th className="p-5 pl-8 font-black">Fecha y Hora</th>
                        <th className="p-5 font-black">Cliente / Documento</th>
                        <th className="p-5 font-black">Pago</th>
                        <th className="p-5 font-black text-right">Total</th>
                        <th className="p-5 pr-8 font-black text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ventasPaginadas.map(venta => (
                        <tr key={venta.idVenta} className="hover:bg-slate-50 transition-colors">
                          <td className="p-5 pl-8">
                            <p className="font-bold text-slate-700 text-sm">{new Date(venta.fechaVenta).toLocaleDateString('es-PE')}</p>
                            <p className="text-xs text-slate-400 font-medium">{new Date(venta.fechaVenta).toLocaleTimeString('es-PE')}</p>
                          </td>
                          <td className="p-5">
                            <p className="font-bold text-slate-700 text-sm line-clamp-1">{venta.nombreCliente || 'Cliente General'}</p>
                            <p className="text-xs text-slate-400 font-medium">Doc: {venta.documentoCliente || 'S/N'}</p>
                          </td>
                          <td className="p-5">
                            <p className="font-bold text-slate-600 text-sm flex items-center gap-1.5">
                              {venta.metodoPago === 'Efectivo' && <Wallet className="w-4 h-4 text-emerald-500"/>}
                              {venta.metodoPago === 'Tarjeta' && <CreditCard className="w-4 h-4 text-blue-500"/>}
                              {(venta.metodoPago === 'Yape' || venta.metodoPago === 'Plin') && <Smartphone className="w-4 h-4 text-purple-500"/>}
                              {venta.metodoPago || 'Efectivo'}
                            </p>
                          </td>
                          <td className="p-5 text-right font-black text-[#00C193]">S/ {venta.total.toFixed(2)}</td>
                          <td className="p-5 pr-8 text-center">
                            <button onClick={() => verTicketHistorico(venta)} className="px-4 py-2 bg-[#E6F7F4] text-[#00C193] hover:bg-[#00C193] hover:text-white rounded-xl transition-colors inline-flex items-center gap-1 text-xs font-bold shadow-sm">
                              <Eye className="w-4 h-4" /> Ticket
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-6 border-t border-slate-100 bg-white flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
                  <div className="text-sm font-medium text-slate-500 text-center md:text-left">
                    Mostrando del <span className="font-black text-slate-800">{indicePrimerElemento + 1}</span> al <span className="font-black text-slate-800">{Math.min(indiceUltimoElemento, ventasHistorial.length)}</span> de <span className="font-black text-[#00C193]">{ventasHistorial.length}</span> ventas en total
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                    <span className="text-sm font-black text-slate-700 bg-slate-100 px-4 py-2 rounded-xl border border-slate-200">
                      Página {paginaActual} de {totalPaginas}
                    </span>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setPaginaActual(prev => Math.max(prev - 1, 1))}
                        disabled={paginaActual === 1}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-slate-600 font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 hover:border-[#00C193] hover:text-[#00C193] transition-all shadow-sm"
                      >
                        <ChevronLeft className="w-4 h-4" /> Anterior
                      </button>
                      <button 
                        onClick={() => setPaginaActual(prev => Math.min(prev + 1, totalPaginas))}
                        disabled={paginaActual === totalPaginas}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-slate-600 font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 hover:border-[#00C193] hover:text-[#00C193] transition-all shadow-sm"
                      >
                        Siguiente <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 🟢 MODAL DE BLOQUEO GLOBAL */}
        {showGlobalBlockModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl relative text-center animate-in zoom-in-95">
              <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-md">
                <Store className="w-10 h-10 text-orange-500" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">Selecciona una Sede</h3>
              <p className="text-slate-500 font-medium mb-6">
                Para gestionar la <span className="font-bold text-slate-700">Caja Registradora</span> o el <span className="font-bold text-slate-700">Inventario</span>, necesitas cambiar la "Vista Global" por una sede específica en el selector de arriba.
              </p>
              <button 
                onClick={() => setShowGlobalBlockModal(false)}
                className="w-full bg-slate-800 text-white font-black py-4 rounded-xl hover:bg-slate-700 transition-all shadow-lg"
              >
                Entendido
              </button>
            </div>
          </div>
        )}

        {showInventario && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
            <div className="bg-white rounded-[2rem] w-full max-w-5xl max-h-[90vh] shadow-2xl relative flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  <Package className="text-[#00C193] w-6 h-6" /> Control de Inventario
                </h2>
                <button onClick={cerrarModalInventario} className="text-slate-400 hover:text-red-500 transition-colors"><X className="w-6 h-6" /></button>
              </div>
              
              <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                <div className="w-full lg:w-1/3 bg-white p-6 border-r border-slate-100 flex flex-col overflow-y-auto">
                  
                  {rol !== 'SUPER_ADMIN' ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                      <ShieldAlert className="w-16 h-16 text-slate-200 mb-4" />
                      <h3 className="font-black text-slate-700 text-lg">Acceso Restringido</h3>
                      <p className="text-sm font-medium text-slate-500 mt-2">Solo el Súper Administrador puede modificar los ingresos de inventario.</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center mb-6">
                          <h3 className="font-bold text-slate-700 uppercase tracking-widest text-xs">
                            {modoInventario === 'CREAR' ? 'Agregar Nuevo' : 'Reabastecer'}
                          </h3>
                          <span className="bg-slate-100 text-slate-400 px-2 py-1 rounded text-[10px] font-bold">
                              Paso {pasoInventario} de 2
                          </span>
                      </div>

                      {modoInventario === 'AUMENTAR' && pasoInventario === 1 && (
                          <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl mb-4 text-xs font-bold text-blue-600 flex justify-between items-center">
                              Aumentando stock de producto
                              <button onClick={volverAModoCrear} className="text-blue-400 hover:text-blue-700 underline">Cancelar</button>
                          </div>
                      )}
                      
                      {pasoInventario === 1 && (
                        <form onSubmit={handleContinuarPaso2} className="space-y-5 animate-in fade-in slide-in-from-left-4">
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Nombre del Producto</label>
                            <input type="text" required placeholder="Ej: Agua Mineral" className="w-full p-3 bg-[#F8FAFC] border border-slate-200 rounded-xl focus:border-[#00C193] outline-none text-sm font-bold disabled:opacity-50" value={formProducto.nombre} onChange={e => setFormProducto({...formProducto, nombre: e.target.value})} disabled={modoInventario === 'AUMENTAR'} />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Precio (S/)</label>
                              <input type="number" required step="0.10" placeholder="0.00" className="w-full p-3 bg-[#F8FAFC] border border-slate-200 rounded-xl focus:border-[#00C193] outline-none text-sm font-bold disabled:opacity-50" value={formProducto.precio} onChange={e => setFormProducto({...formProducto, precio: e.target.value})} disabled={modoInventario === 'AUMENTAR'} />
                            </div>
                            <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                                  {modoInventario === 'AUMENTAR' ? '+ Unidades' : 'Stock Total'}
                              </label>
                              <input type="number" required min="1" placeholder="Ej: 10" className="w-full p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl focus:border-blue-500 outline-none text-sm font-black" value={formProducto.stock} onChange={e => setFormProducto({...formProducto, stock: e.target.value})} />
                            </div>
                          </div>
                          <button type="submit" className="w-full bg-slate-800 text-white font-black py-3.5 rounded-xl hover:bg-slate-700 mt-4 transition-all flex items-center justify-center gap-2">
                            Continuar <ArrowRight className="w-4 h-4" />
                          </button>
                        </form>
                      )}

                      {pasoInventario === 2 && (
                        <div className="space-y-6 flex flex-col flex-1 animate-in fade-in slide-in-from-right-4">
                          
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Escaneando unidades de:</p>
                              <p className="font-black text-slate-800 line-clamp-1">{formProducto.nombre}</p>
                              <p className="text-[#00C193] font-black text-2xl mt-2">{codigosEscaneados.length} de {stockDeseado}</p>
                          </div>

                          {!escaneoCompleto ? (
                              <div className="relative">
                                  <ScanLine className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-[#00C193] animate-pulse" />
                                  <input 
                                      ref={inputScannerRef}
                                      type="text" 
                                      placeholder="Escanea el código aquí..." 
                                      className="w-full pl-12 pr-4 py-4 bg-white border-2 border-[#00C193] shadow-[0_0_15px_rgba(0,193,147,0.2)] rounded-2xl outline-none text-sm font-black text-slate-700 transition-all focus:ring-4 focus:ring-[#00C193]/20" 
                                      value={codigoActual} 
                                      onChange={e => setCodigoActual(e.target.value)}
                                      onKeyDown={handleEscanearNuevoCodigo}
                                  />
                                  <p className="text-[10px] text-center text-slate-400 mt-3 font-medium">Usa la pistola lectora o presiona ENTER</p>
                              </div>
                          ) : (
                              <div className="bg-green-50 border border-green-200 p-4 rounded-xl text-center">
                                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                                  <p className="font-black text-green-700 text-sm">Escaneo Completado</p>
                              </div>
                          )}

                          <div className="mt-auto pt-4 space-y-3">
                              {escaneoCompleto && (
                                  <button onClick={handleAgregarInventarioFinal} className="w-full bg-[#00C193] text-white font-black py-4 rounded-xl hover:bg-[#00A880] shadow-lg shadow-[#00C193]/30 transition-all flex items-center justify-center gap-2 text-lg animate-in zoom-in">
                                      <Save className="w-5 h-5" /> {modoInventario === 'CREAR' ? 'Guardar al Inventario' : 'Confirmar Reabastecimiento'}
                                  </button>
                              )}
                              <button onClick={() => setPasoInventario(1)} className="w-full bg-slate-100 text-slate-500 font-bold py-3 rounded-xl hover:bg-slate-200 transition-all text-xs uppercase tracking-widest">
                                  Volver al Paso 1
                              </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="w-full lg:w-2/3 bg-slate-50 p-6 overflow-y-auto">
                  {productos.length === 0 ? (
                     <div className="h-full flex items-center justify-center text-slate-400 font-medium">No hay productos en inventario.</div>
                  ) : (
                    <table className="w-full text-left bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
                      <thead className="bg-slate-100 text-slate-500 text-[10px] uppercase tracking-widest">
                        <tr>
                          <th className="p-4 pl-6">Producto / Código</th>
                          <th className="p-4 text-center">Stock</th>
                          <th className="p-4 text-right">Precio</th>
                          {rol === 'SUPER_ADMIN' && <th className="p-4 text-center pr-6">Acciones</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {productos.map(p => (
                          <tr key={p.idProducto} className={`hover:bg-slate-50 transition-colors ${productoSeleccionado === p.idProducto ? 'bg-blue-50/50' : ''}`}>
                            <td className="p-4 pl-6">
                              <p className="font-bold text-slate-700 text-sm">{p.nombre}</p>
                              <p className="text-xs font-bold text-slate-400 mt-0.5">
                                  {p.codigo} 
                                  {p.stock > 1 && <span className="ml-2 text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">+ var</span>}
                              </p>
                            </td>
                            <td className="p-4 text-center">
                              <span className={`px-2.5 py-1 rounded-md text-xs font-black ${p.stock <= 5 ? 'bg-red-100 text-red-600' : 'bg-[#E6F7F4] text-[#00C193]'}`}>
                                {p.stock}
                              </span>
                            </td>
                            <td className="p-4 text-right font-black text-slate-800">S/ {p.precio.toFixed(2)}</td>
                            
                            {rol === 'SUPER_ADMIN' && (
                                <td className="p-4 text-center pr-6">
                                    <button 
                                      onClick={() => prepararReabastecimiento(p)}
                                      className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm"
                                      title="Aumentar Stock"
                                    >
                                        <PlusCircle className="w-5 h-5" />
                                    </button>
                                </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {showPOS && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 print:hidden">
            <div className="bg-white rounded-[2rem] w-full max-w-6xl h-[90vh] shadow-2xl relative flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-200">
              
              <button onClick={() => setShowPOS(false)} className="absolute top-4 right-4 z-10 bg-white shadow-md text-slate-400 hover:text-red-500 p-2 rounded-full transition-colors">
                <XCircle className="w-6 h-6" />
              </button>

              <div className="flex-1 bg-slate-50 flex flex-col h-full overflow-hidden">
                <div className="p-6 border-b border-slate-200 bg-white">
                  <h2 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
                    <Coffee className="w-5 h-5 text-[#00C193]" /> Caja Registradora
                  </h2>
                  <div className="relative">
                    <ScanLine className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#00C193]" />
                    <input type="text" placeholder="Escanear código o buscar..." autoFocus className="w-full pl-12 pr-4 py-4 bg-[#F8FAFC] border-2 border-transparent rounded-2xl focus:border-[#00C193] outline-none font-black text-slate-700 transition-all" value={busquedaPOS} onChange={(e) => setBusquedaPOS(e.target.value)} onKeyDown={handleEscanerPOS} />
                  </div>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {productos.filter(p => p.nombre.toLowerCase().includes(busquedaPOS.toLowerCase()) || p.codigo.toLowerCase().includes(busquedaPOS.toLowerCase())).map(prod => (
                      <div key={prod.idProducto} onClick={() => agregarAlCarrito(prod)} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:border-[#00C193] transition-all flex flex-col items-center text-center relative">
                        <div className="absolute top-2 right-2 text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">Stock: {prod.stock}</div>
                        <div className="w-12 h-12 bg-[#E6F7F4] rounded-full flex items-center justify-center text-[#00C193] mb-3 mt-4"><ShoppingCart className="w-5 h-5" /></div>
                        <p className="font-bold text-slate-700 text-sm mb-1 leading-tight">{prod.nombre}</p>
                        <p className="font-black text-[#00C193]">S/ {prod.precio.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="w-full md:w-[420px] bg-white border-l border-slate-100 flex flex-col h-full">
                <div className="p-6 border-b border-slate-100 bg-slate-800 text-white flex justify-between items-center">
                  <h2 className="text-lg font-black flex items-center gap-2"><CreditCard className="w-5 h-5" /> Ticket Actual</h2>
                  <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-black">{carrito.length} Ítems</span>
                </div>
                
                <div className="flex-1 p-6 overflow-y-auto bg-[#F8FAFC]">
                  {carrito.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                      <ShoppingCart className="w-12 h-12 mb-3" />
                      <p className="font-bold">Aún no hay productos</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {carrito.map(item => (
                        <div key={item.idProducto} className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
                          <div className="flex-1 pr-3">
                            <p className="font-bold text-slate-700 text-sm line-clamp-1">{item.nombre}</p>
                            <p className="text-slate-400 font-bold text-xs mt-0.5">S/ {item.precio.toFixed(2)} c/u</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <p className="text-[#00C193] font-black text-sm">S/ {(item.precio * item.cantidad).toFixed(2)}</p>
                            <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-1 border border-slate-100">
                              <button onClick={() => quitarDelCarrito(item.idProducto)} className="p-1 text-slate-500 hover:text-red-500 hover:bg-slate-200 rounded-md"><Minus className="w-3 h-3"/></button>
                              <span className="font-black text-xs w-5 text-center">{item.cantidad}</span>
                              <button onClick={() => agregarAlCarrito(item)} className="p-1 text-slate-500 hover:text-[#00C193] hover:bg-slate-200 rounded-md"><Plus className="w-3 h-3"/></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-6 bg-white border-t border-slate-100 shadow-[0_-10px_20px_rgba(0,0,0,0.03)] z-10">
                  <div className="mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex gap-2 mb-3">
                      <button onClick={() => { setTipoComprobante('Boleta Simple'); setDocCliente('00000000'); setNombreCliente('Clientes Varios'); }} className={`flex-1 py-1.5 rounded-md text-xs font-black uppercase tracking-widest transition-colors ${tipoComprobante === 'Boleta Simple' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}>Boleta Simple</button>
                      <button onClick={() => { setTipoComprobante('Boleta'); setDocCliente(''); setNombreCliente(''); }} className={`flex-1 py-1.5 rounded-md text-xs font-black uppercase tracking-widest transition-colors ${tipoComprobante === 'Boleta' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}>Boleta</button>
                      <button onClick={() => { setTipoComprobante('Factura'); setDocCliente(''); setNombreCliente(''); }} className={`flex-1 py-1.5 rounded-md text-xs font-black uppercase tracking-widest transition-colors ${tipoComprobante === 'Factura' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}>Factura</button>
                    </div>
                    <div className="flex gap-2">
                      <div className="relative w-1/3">
                        <input 
                          id="documento" 
                          type="text" 
                          placeholder={tipoComprobante === 'Factura' ? 'RUC' : 'DNI'} 
                          className={`w-full p-2 pr-8 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-[#00C193] transition-colors ${tipoComprobante === 'Boleta Simple' ? 'bg-slate-100 text-slate-400' : 'bg-white'}`} 
                          value={docCliente} 
                          onChange={e => setDocCliente(e.target.value)} 
                          onKeyDown={e => { if (e.key === 'Enter' && tipoComprobante !== 'Boleta Simple') consultarDocumento(); }} 
                          disabled={tipoComprobante === 'Boleta Simple'}
                        />
                        {tipoComprobante !== 'Boleta Simple' && (
                          <button onClick={consultarDocumento} disabled={buscandoDoc || !docCliente} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#00C193]">
                            {buscandoDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                      <input 
                        id="nombreCompleto" 
                        type="text" 
                        placeholder={tipoComprobante === 'Factura' ? 'Razón Social' : 'Nombre Cliente'} 
                        className={`w-2/3 p-2 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-[#00C193] transition-colors ${tipoComprobante === 'Boleta Simple' ? 'bg-slate-100 text-slate-400' : 'bg-white'}`} 
                        value={nombreCliente} 
                        onChange={e => setNombreCliente(e.target.value)} 
                        disabled={tipoComprobante === 'Boleta Simple'}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center mb-4">
                    <span className="text-slate-500 font-bold uppercase tracking-widest text-xs">Total a Cobrar</span>
                    <span className="text-3xl font-black text-slate-800">S/ {totalCarrito.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button onClick={() => setCarrito([])} disabled={carrito.length === 0} className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 disabled:opacity-50"><Trash2 className="w-6 h-6" /></button>
                    <button onClick={() => setShowConfirmacion(true)} disabled={carrito.length === 0 || buscandoDoc || !docCliente || !nombreCliente} className="flex-1 bg-[#00C193] text-white font-black py-4 rounded-2xl hover:bg-[#00A880] transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 text-lg">
                      Cobrar
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {showConfirmacion && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl relative animate-in zoom-in-95 duration-200 text-center">
              
              <h3 className="text-2xl font-black text-slate-800 mb-1">Completar Pago</h3>
              <p className="text-slate-500 font-medium mb-6">Total a cobrar: <span className="font-black text-2xl text-[#00C193]">S/ {totalCarrito.toFixed(2)}</span></p>

              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">¿Cómo paga el cliente?</p>
              
              <div className="grid grid-cols-2 gap-3 mb-8">
                <button onClick={() => setMetodoPago('Efectivo')} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 font-bold transition-all ${metodoPago === 'Efectivo' ? 'border-[#00C193] bg-[#E6F7F4] text-[#00C193]' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                  <Wallet className="w-8 h-8" /> Efectivo
                </button>
                <button onClick={() => setMetodoPago('Tarjeta')} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 font-bold transition-all ${metodoPago === 'Tarjeta' ? 'border-blue-500 bg-blue-50 text-blue-500' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                  <CreditCard className="w-8 h-8" /> Tarjeta / POS
                </button>
                <button onClick={() => setMetodoPago('Yape')} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 font-bold transition-all ${metodoPago === 'Yape' ? 'border-purple-500 bg-purple-50 text-purple-600' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                  <Smartphone className="w-8 h-8" /> Yape
                </button>
                <button onClick={() => setMetodoPago('Plin')} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 font-bold transition-all ${metodoPago === 'Plin' ? 'border-sky-500 bg-sky-50 text-sky-600' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                  <Smartphone className="w-8 h-8" /> Plin
                </button>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowConfirmacion(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                  Cancelar
                </button>
                <button onClick={procesarVenta} className="flex-1 py-4 bg-[#00C193] text-white font-black rounded-xl shadow-lg shadow-[#00C193]/30 hover:bg-[#00A880] transition-colors flex items-center justify-center gap-2">
                  <FileOutput className="w-5 h-5" /> Emitir Ticket
                </button>
              </div>
            </div>
          </div>
        )}

        {ticketGenerado && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div className="absolute top-6 right-6 flex gap-3 print:hidden">
              <button onClick={() => window.print()} className="bg-white text-slate-800 hover:text-[#00C193] font-black px-6 py-3 rounded-xl shadow-lg flex items-center gap-2">
                <Printer className="w-5 h-5" /> Imprimir
              </button>
              <button onClick={() => setTicketGenerado(null)} className="bg-red-500 text-white font-black px-6 py-3 rounded-xl shadow-lg hover:bg-red-600">
                Cerrar
              </button>
            </div>

            <div className="bg-white p-8 w-full max-w-[320px] shadow-2xl relative print:shadow-none print:w-full">
              <div className="text-center border-b-2 border-dashed border-slate-300 pb-4 mb-4">
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest">Complejo Deportivo</h2>
                <p className="text-xs font-bold text-slate-500 mt-1">RUC: 20123456789</p>
                <p className="text-xs font-bold text-slate-500">Av. Principal 123 - Ciudad</p>
              </div>

              <div className="text-center mb-4">
                <h3 className="text-lg font-black uppercase">
                  {ticketGenerado.tipo.includes('Factura') ? 'FACTURA ELECTRÓNICA' : 'BOLETA ELECTRÓNICA'}
                </h3>
                <p className="text-sm font-bold">N° {ticketGenerado.tipo.includes('Factura') ? 'F001' : 'B001'} - {ticketGenerado.idVenta.substring(0,6).toUpperCase()}</p>
              </div>

              <div className="text-xs font-bold text-slate-600 mb-4 space-y-1">
                <p>Fecha: {ticketGenerado.fecha}</p>
                <p>Cliente: {ticketGenerado.cliente}</p>
                <p>{ticketGenerado.tipo.includes('Factura') ? 'RUC' : 'DNI'}: {ticketGenerado.documento}</p>
                <p className="text-slate-800 uppercase bg-slate-100 inline-block px-2 py-0.5 mt-1 rounded">Pago: {ticketGenerado.metodoPago}</p>
              </div>

              <table className="w-full text-xs font-bold text-slate-800 mb-4">
                <thead className="border-y border-slate-300">
                  <tr>
                    <th className="py-2 text-left">CANT/DESC</th>
                    <th className="py-2 text-right">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {ticketGenerado.items.map((item, index) => (
                    <tr key={index} className="border-b border-slate-100">
                      <td className="py-2">
                        <p>{item.cantidad} x {item.nombre}</p>
                        <p className="text-[10px] text-slate-400 font-normal">S/ {item.precio.toFixed(2)} c/u</p>
                      </td>
                      <td className="py-2 text-right">S/ {(item.precio * item.cantidad).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t-2 border-slate-800 pt-2 flex justify-between items-center text-lg font-black text-slate-800">
                <span>TOTAL S/</span>
                <span>{ticketGenerado.total.toFixed(2)}</span>
              </div>

              <div className="text-center mt-8 text-xs font-bold text-slate-500">
                <p>¡Gracias por tu compra!</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}