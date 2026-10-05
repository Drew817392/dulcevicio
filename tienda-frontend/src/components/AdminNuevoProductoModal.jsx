import { useState, useRef, useEffect } from 'react';
import { crearProducto, subirImagenProducto } from '../services/api';

export default function AdminNuevoProductoModal({ isOpen, onClose, onProductoCreado }) {
  const fileInputRef = useRef(null);
  const [nombre, setNombre] = useState('');
  const [precioFinal, setPrecioFinal] = useState('');
  const [stock, setStock] = useState('10');
  const [cuotasCantidad, setCuotasCantidad] = useState('1');
  const [cuotasValor, setCuotasValor] = useState('0');
  const [garantiaMeses, setGarantiaMeses] = useState('0');
  
  const [archivo, setArchivo] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState(null);
  const [exitoMensaje, setExitoMensaje] = useState(null);

  // Auto-calcular el valor de la cuota cuando cambia el precio o la cantidad de cuotas
  useEffect(() => {
    const precio = parseFloat(precioFinal);
    const cuotas = parseInt(cuotasCantidad, 10);
    if (!isNaN(precio) && precio > 0 && !isNaN(cuotas) && cuotas > 0) {
      setCuotasValor((precio / cuotas).toFixed(2));
    } else {
      setCuotasValor('0');
    }
  }, [precioFinal, cuotasCantidad]);

  // ObjectURL cleanup para preview de imagen
  useEffect(() => {
    if (!archivo) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(archivo);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [archivo]);

  // Reset del formulario cuando se abre/cierra
  useEffect(() => {
    if (!isOpen) {
      setNombre('');
      setPrecioFinal('');
      setStock('10');
      setCuotasCantidad('1');
      setCuotasValor('0');
      setGarantiaMeses('0');
      setArchivo(null);
      setPreviewUrl(null);
      setErrorMensaje(null);
      setExitoMensaje(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    setErrorMensaje(null);
    const file = e.target.files?.[0];
    if (!file) {
      setArchivo(null);
      return;
    }

    // 1. Validación de extensión en cliente (.jpg, .jpeg, .png, .webp)
    const extension = file.name.split('.').pop()?.toLowerCase();
    const extensionesPermitidas = ['jpg', 'jpeg', 'png', 'webp'];
    if (!extension || !extensionesPermitidas.includes(extension)) {
      setErrorMensaje('Formato de imagen no permitido. Solo se aceptan .jpg, .jpeg, .png y .webp.');
      setArchivo(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 2. Validación de tamaño (< 2 MB)
    const maxBytes = 2 * 1024 * 1024;
    if (file.size > maxBytes) {
      setErrorMensaje('El archivo supera el límite de 2 MB. Por favor elige una imagen más liviana.');
      setArchivo(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setArchivo(file);
  };

  const handleLimpiarArchivo = () => {
    setArchivo(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMensaje(null);
    setExitoMensaje(null);

    const precioNum = parseFloat(precioFinal);
    const stockNum = parseInt(stock, 10);
    const cuotasCantNum = parseInt(cuotasCantidad, 10);
    const cuotasValNum = parseFloat(cuotasValor);
    const garantiaNum = parseInt(garantiaMeses, 10);

    if (!nombre.trim()) {
      setErrorMensaje('Debes ingresar el nombre del producto.');
      return;
    }

    if (isNaN(precioNum) || precioNum <= 0) {
      setErrorMensaje('Debes ingresar un precio válido mayor a 0.');
      return;
    }

    if (isNaN(stockNum) || stockNum < 0) {
      setErrorMensaje('El stock debe ser un número entero mayor o igual a 0.');
      return;
    }

    setGuardando(true);

    try {
      // 1. Crear producto en la base de datos
      const payload = {
        nombre: nombre.trim(),
        precio_final: precioNum,
        stock: stockNum,
        cuotas_cantidad: isNaN(cuotasCantNum) || cuotasCantNum < 1 ? 1 : cuotasCantNum,
        cuotas_valor: isNaN(cuotasValNum) || cuotasValNum < 0 ? 0.0 : cuotasValNum,
        garantia_meses: isNaN(garantiaNum) || garantiaNum < 0 ? 0 : garantiaNum,
      };

      let productoCreado = await crearProducto(payload);

      // 2. Si se adjuntó imagen, subirla
      if (archivo && productoCreado?.id) {
        try {
          productoCreado = await subirImagenProducto(productoCreado.id, archivo);
        } catch (imgErr) {
          console.warn('Error al subir imagen después de crear producto:', imgErr);
          setErrorMensaje(`Producto creado, pero falló la subida de imagen: ${imgErr.message}`);
          if (onProductoCreado) onProductoCreado(productoCreado);
          setGuardando(false);
          return;
        }
      }

      setExitoMensaje(`¡Producto "${productoCreado.nombre}" publicado con éxito! 🎉`);
      if (onProductoCreado) {
        onProductoCreado(productoCreado);
      }

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setErrorMensaje(err.message || 'Ocurrió un error al crear el producto.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div className="modal-box admin-new-product-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🧁 Subir Nuevo Producto al Catálogo</h3>
          <button className="close-cart-btn" onClick={onClose} disabled={guardando}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto', padding: '16px 24px' }}>
            {errorMensaje && (
              <div className="auth-error-banner" style={{ marginBottom: '16px' }}>
                ⚠️ {errorMensaje}
              </div>
            )}

            {exitoMensaje && (
              <div role="status" className="toast-success-mini" style={{ marginBottom: '16px' }}>
                ✓ {exitoMensaje}
              </div>
            )}

            {/* Nombre del Producto */}
            <div className="input-group">
              <label htmlFor="nuevo-nombre-input">Nombre del Producto / Postre *</label>
              <input
                id="nuevo-nombre-input"
                type="text"
                className="modal-input"
                placeholder="Ej: Cheesecake New York con Frutos Rojos"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                disabled={guardando}
              />
            </div>

            {/* Fila de Precio y Stock */}
            <div className="admin-form-row">
              <div className="input-group" style={{ flex: 1 }}>
                <label htmlFor="nuevo-precio-input">Precio Final ($ ARS) *</label>
                <input
                  id="nuevo-precio-input"
                  type="number"
                  step="0.01"
                  min="0"
                  className="modal-input"
                  placeholder="Ej: 4500"
                  value={precioFinal}
                  onChange={(e) => setPrecioFinal(e.target.value)}
                  required
                  disabled={guardando}
                />
              </div>

              <div className="input-group" style={{ flex: 1 }}>
                <label htmlFor="nuevo-stock-input">Stock Inicial *</label>
                <input
                  id="nuevo-stock-input"
                  type="number"
                  min="0"
                  className="modal-input"
                  placeholder="Ej: 15"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  required
                  disabled={guardando}
                />
              </div>
            </div>

            {/* Fila de Cuotas y Garantía */}
            <div className="admin-form-row">
              <div className="input-group" style={{ flex: 1 }}>
                <label htmlFor="nuevo-cuotas-input">Cuotas sin Interés</label>
                <select
                  id="nuevo-cuotas-input"
                  className="modal-input"
                  value={cuotasCantidad}
                  onChange={(e) => setCuotasCantidad(e.target.value)}
                  disabled={guardando}
                >
                  <option value="1">1 pago (Sin cuotas)</option>
                  <option value="3">3 cuotas</option>
                  <option value="6">6 cuotas</option>
                  <option value="12">12 cuotas</option>
                </select>
              </div>

              {parseInt(cuotasCantidad, 10) > 1 && (
                <div className="input-group" style={{ flex: 1 }}>
                  <label htmlFor="nuevo-cuotas-valor-input">Valor Cuota ($)</label>
                  <input
                    id="nuevo-cuotas-valor-input"
                    type="number"
                    step="0.01"
                    min="0"
                    className="modal-input"
                    value={cuotasValor}
                    onChange={(e) => setCuotasValor(e.target.value)}
                    disabled={guardando}
                  />
                </div>
              )}

              <div className="input-group" style={{ flex: 1 }}>
                <label htmlFor="nuevo-garantia-input">Garantía (Meses)</label>
                <input
                  id="nuevo-garantia-input"
                  type="number"
                  min="0"
                  className="modal-input"
                  placeholder="0"
                  value={garantiaMeses}
                  onChange={(e) => setGarantiaMeses(e.target.value)}
                  disabled={guardando}
                />
              </div>
            </div>

            {/* Subida de Imagen */}
            <div className="input-group" style={{ marginTop: '12px' }}>
              <label htmlFor="nuevo-file-upload">Foto del Producto (JPG, PNG, WebP - Máx 2 MB)</label>
              <input
                id="nuevo-file-upload"
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/*"
                onChange={handleFileChange}
                disabled={guardando}
                className="file-input-control"
              />
              <span className="input-hint">
                💡 Opcional: si no subes una foto ahora, se asignará la imagen artesanal por defecto y podrás cambiarla luego.
              </span>
            </div>

            {/* Previsualización de imagen seleccionada */}
            {previewUrl && (
              <div className="upload-preview-container" style={{ marginTop: '12px' }}>
                <div className="preview-box">
                  <span className="preview-label">Vista previa de la foto:</span>
                  <div className="preview-image-wrapper aspect-square" style={{ width: '130px', height: '130px' }}>
                    <img
                      src={previewUrl}
                      alt="Vista previa"
                      className="preview-image object-cover"
                    />
                  </div>
                  <div className="file-selected-info" style={{ width: '100%', maxWidth: '300px' }}>
                    <span style={{ fontSize: '12px' }}>📁 {archivo?.name}</span>
                    <button
                      type="button"
                      className="btn-clear-file"
                      onClick={handleLimpiarArchivo}
                      disabled={guardando}
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="modal-actions" style={{ padding: '16px 24px 24px 24px', display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid var(--border)' }}>
            <button
              type="button"
              className="volver-catalogo-btn"
              onClick={onClose}
              disabled={guardando}
              style={{ margin: 0 }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="checkout-btn"
              disabled={guardando || !nombre.trim() || !precioFinal}
              style={{ margin: 0, minWidth: '180px' }}
            >
              {guardando ? 'Publicando...' : '✨ Publicar Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
