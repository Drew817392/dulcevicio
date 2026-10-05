import { useState, useRef, useEffect } from 'react';
import { actualizarProducto, subirImagenProducto } from '../services/api';
import { urlImagen } from '../utils/imagenes';

export default function AdminEditarProductoModal({ isOpen, producto, onClose, onProductoActualizado }) {
  const fileInputRef = useRef(null);
  const [nombre, setNombre] = useState('');
  const [precioFinal, setPrecioFinal] = useState('');
  const [stock, setStock] = useState('0');
  const [cuotasCantidad, setCuotasCantidad] = useState('1');
  const [cuotasValor, setCuotasValor] = useState('0');
  const [garantiaMeses, setGarantiaMeses] = useState('0');

  const [archivo, setArchivo] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState(null);
  const [exitoMensaje, setExitoMensaje] = useState(null);

  // Cargar los valores del producto actual cuando se abre el modal
  useEffect(() => {
    if (producto && isOpen) {
      setNombre(producto.nombre || '');
      setPrecioFinal(producto.precio_final !== undefined ? String(producto.precio_final) : '');
      setStock(producto.stock !== undefined ? String(producto.stock) : '0');
      setCuotasCantidad(producto.cuotas_cantidad !== undefined ? String(producto.cuotas_cantidad) : '1');
      setCuotasValor(producto.cuotas_valor !== undefined ? String(producto.cuotas_valor) : '0');
      setGarantiaMeses(producto.garantia_meses !== undefined ? String(producto.garantia_meses) : '0');
      setArchivo(null);
      setPreviewUrl(null);
      setErrorMensaje(null);
      setExitoMensaje(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [producto, isOpen]);

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

  // Recalcular valor de cuota si cambia el precio o cuotas y no se ha modificado manualmente
  const handlePrecioChange = (nuevoPrecio) => {
    setPrecioFinal(nuevoPrecio);
    const p = parseFloat(nuevoPrecio);
    const c = parseInt(cuotasCantidad, 10);
    if (!isNaN(p) && p > 0 && !isNaN(c) && c > 0) {
      setCuotasValor((p / c).toFixed(2));
    }
  };

  const handleCuotasChange = (nuevasCuotas) => {
    setCuotasCantidad(nuevasCuotas);
    const p = parseFloat(precioFinal);
    const c = parseInt(nuevasCuotas, 10);
    if (!isNaN(p) && p > 0 && !isNaN(c) && c > 0) {
      setCuotasValor((p / c).toFixed(2));
    }
  };

  if (!isOpen || !producto) return null;

  const handleFileChange = (e) => {
    setErrorMensaje(null);
    const file = e.target.files?.[0];
    if (!file) {
      setArchivo(null);
      return;
    }

    // Validación de extensión (.jpg, .jpeg, .png, .webp)
    const extension = file.name.split('.').pop()?.toLowerCase();
    const extensionesPermitidas = ['jpg', 'jpeg', 'png', 'webp'];
    if (!extension || !extensionesPermitidas.includes(extension)) {
      setErrorMensaje('Formato de imagen no permitido. Solo se aceptan .jpg, .jpeg, .png y .webp.');
      setArchivo(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validación de tamaño (< 2 MB)
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
      setErrorMensaje('El nombre del producto no puede estar vacío.');
      return;
    }

    if (isNaN(precioNum) || precioNum <= 0) {
      setErrorMensaje('El precio debe ser un número mayor a 0.');
      return;
    }

    if (isNaN(stockNum) || stockNum < 0) {
      setErrorMensaje('El stock debe ser un número entero mayor o igual a 0.');
      return;
    }

    setGuardando(true);

    try {
      // 1. Actualizar datos base del producto en la base de datos
      const payload = {
        nombre: nombre.trim(),
        precio_final: precioNum,
        stock: stockNum,
        cuotas_cantidad: isNaN(cuotasCantNum) || cuotasCantNum < 1 ? 1 : cuotasCantNum,
        cuotas_valor: isNaN(cuotasValNum) || cuotasValNum < 0 ? 0.0 : cuotasValNum,
        garantia_meses: isNaN(garantiaNum) || garantiaNum < 0 ? 0 : garantiaNum,
      };

      let productoActualizado = await actualizarProducto(producto.id, payload);

      // 2. Si se seleccionó una nueva foto, subirla
      if (archivo) {
        try {
          productoActualizado = await subirImagenProducto(producto.id, archivo);
        } catch (imgErr) {
          console.warn('Error al subir nueva imagen:', imgErr);
          setErrorMensaje(`Datos actualizados, pero falló la subida de foto: ${imgErr.message}`);
          if (onProductoActualizado) onProductoActualizado(productoActualizado);
          setGuardando(false);
          return;
        }
      }

      setExitoMensaje(`¡Producto "${productoActualizado.nombre}" actualizado con éxito! ✨`);
      if (onProductoActualizado) {
        onProductoActualizado(productoActualizado);
      }

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setErrorMensaje(err.message || 'Error al actualizar el producto.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div className="modal-box admin-new-product-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>✏️ Editar Producto #{producto.id}: {producto.nombre}</h3>
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
              <label htmlFor="edit-nombre-input">Nombre del Producto / Postre *</label>
              <input
                id="edit-nombre-input"
                type="text"
                className="modal-input"
                placeholder="Nombre del postre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                disabled={guardando}
              />
            </div>

            {/* Fila de Precio y Stock */}
            <div className="admin-form-row">
              <div className="input-group" style={{ flex: 1 }}>
                <label htmlFor="edit-precio-input">Precio Final ($ ARS) *</label>
                <input
                  id="edit-precio-input"
                  type="number"
                  step="0.01"
                  min="0"
                  className="modal-input"
                  placeholder="Precio"
                  value={precioFinal}
                  onChange={(e) => handlePrecioChange(e.target.value)}
                  required
                  disabled={guardando}
                />
              </div>

              <div className="input-group" style={{ flex: 1 }}>
                <label htmlFor="edit-stock-input">Stock Disponible *</label>
                <input
                  id="edit-stock-input"
                  type="number"
                  min="0"
                  className="modal-input"
                  placeholder="Stock"
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
                <label htmlFor="edit-cuotas-input">Cuotas sin Interés</label>
                <select
                  id="edit-cuotas-input"
                  className="modal-input"
                  value={cuotasCantidad}
                  onChange={(e) => handleCuotasChange(e.target.value)}
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
                  <label htmlFor="edit-cuotas-valor-input">Valor Cuota ($)</label>
                  <input
                    id="edit-cuotas-valor-input"
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
                <label htmlFor="edit-garantia-input">Garantía (Meses)</label>
                <input
                  id="edit-garantia-input"
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

            {/* Foto del Producto: Vista Previa y Selector */}
            <div className="input-group" style={{ marginTop: '16px' }}>
              <label htmlFor="edit-file-upload">Cambiar Foto del Producto (JPG, PNG, WebP - Máx 2 MB)</label>
              
              <div className="upload-preview-container" style={{ margin: '10px 0' }}>
                <div className="preview-box">
                  <span className="preview-label">
                    {previewUrl ? 'Nueva Foto Seleccionada:' : 'Foto Actual:'}
                  </span>
                  <div className="preview-image-wrapper aspect-square" style={{ width: '140px', height: '140px' }}>
                    <img
                      src={previewUrl || urlImagen(producto)}
                      alt={nombre}
                      className="preview-image object-cover"
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>

              <input
                id="edit-file-upload"
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/*"
                onChange={handleFileChange}
                disabled={guardando}
                className="file-input-control"
              />
              <span className="input-hint">
                🔒 Deja este campo vacío si deseas mantener la foto actual del producto.
              </span>
            </div>

            {archivo && (
              <div className="file-selected-info" style={{ marginTop: '8px' }}>
                <span>📁 <strong>{archivo.name}</strong> ({(archivo.size / 1024).toFixed(1)} KB)</span>
                <button
                  type="button"
                  className="btn-clear-file"
                  onClick={handleLimpiarArchivo}
                  disabled={guardando}
                >
                  Quitar
                </button>
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
              {guardando ? 'Guardando...' : '💾 Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
