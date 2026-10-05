import { useState, useRef, useEffect } from 'react';
import { subirImagenProducto } from '../services/api';
import { urlImagen } from '../utils/imagenes';

export default function AdminSubirImagenModal({ isOpen, onClose, producto, onImagenActualizada }) {
  const fileInputRef = useRef(null);
  const [archivo, setArchivo] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState(null);
  const [exitoMensaje, setExitoMensaje] = useState(null);

  // Manejo seguro de memoria para ObjectURL con cleanup en useEffect
  useEffect(() => {
    if (!archivo) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(archivo);
    setPreviewUrl(url);

    // Cleanup de memoria al cambiar de archivo o desmontar
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [archivo]);

  // Reset del formulario al abrir/cerrar modal
  useEffect(() => {
    if (!isOpen) {
      setArchivo(null);
      setPreviewUrl(null);
      setErrorMensaje(null);
      setExitoMensaje(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen]);

  if (!isOpen || !producto) return null;

  const handleFileChange = (e) => {
    setErrorMensaje(null);
    setExitoMensaje(null);

    const file = e.target.files?.[0];
    if (!file) {
      setArchivo(null);
      return;
    }

    // 1. Validación de extensión en cliente (.jpg, .jpeg, .png, .webp)
    const extension = file.name.split('.').pop()?.toLowerCase();
    const extensionesPermitidas = ['jpg', 'jpeg', 'png', 'webp'];
    if (!extension || !extensionesPermitidas.includes(extension)) {
      setErrorMensaje('Formato de archivo no permitido. Solo se aceptan imágenes .jpg, .jpeg, .png y .webp.');
      setArchivo(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 2. Validación de tamaño (< 2 MB) en cliente
    const maxBytes = 2 * 1024 * 1024; // 2 MB
    if (file.size > maxBytes) {
      setErrorMensaje('El archivo supera el límite de 2 MB. Por favor elige una imagen más liviana.');
      setArchivo(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setArchivo(file);
  };

  const handleSubir = async (e) => {
    e.preventDefault();
    if (!archivo || subiendo) return;

    setErrorMensaje(null);
    setExitoMensaje(null);
    setSubiendo(true);

    try {
      const productoActualizado = await subirImagenProducto(producto.id, archivo);
      setExitoMensaje('¡Imagen subida y actualizada con éxito!');
      if (onImagenActualizada) {
        onImagenActualizada(productoActualizado);
      }
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setErrorMensaje(err.message || 'Error al subir la imagen del producto.');
    } finally {
      setSubiendo(false);
    }
  };

  const handleLimpiar = () => {
    setArchivo(null);
    setPreviewUrl(null);
    setErrorMensaje(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div className="modal-box admin-upload-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📷 Cambiar Foto: {producto.nombre}</h3>
          <button className="close-cart-btn" onClick={onClose} disabled={subiendo}>×</button>
        </div>

        <form onSubmit={handleSubir}>
          <div className="modal-body">
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

            <div className="upload-preview-container">
              <div className="preview-box">
                <span className="preview-label">
                  {previewUrl ? 'Nueva Foto Seleccionada (Vista previa):' : 'Foto Actual del Catálogo:'}
                </span>
                <div className="preview-image-wrapper aspect-square">
                  <img
                    src={previewUrl || urlImagen(producto)}
                    alt={producto.nombre}
                    className="preview-image object-cover"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>

            <div className="input-group" style={{ marginTop: '16px' }}>
              <label htmlFor="file-upload-input">
                Seleccionar archivo de imagen (JPG, PNG o WebP - Máx 2 MB)
              </label>
              {/* Input descontrolado SIN atributo value, controlado via ref */}
              <input
                id="file-upload-input"
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/*"
                onChange={handleFileChange}
                disabled={subiendo}
                className="file-input-control"
              />
              <span className="input-hint">
                🔒 El servidor verificará la firma binaria real de bytes (magic numbers).
              </span>
            </div>

            {archivo && (
              <div className="file-selected-info">
                <span>📁 <strong>{archivo.name}</strong> ({(archivo.size / 1024).toFixed(1)} KB)</span>
                <button type="button" className="btn-clear-file" onClick={handleLimpiar} disabled={subiendo}>
                  Quitar
                </button>
              </div>
            )}
          </div>

          <div className="modal-actions" style={{ padding: '0 24px 24px 24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="volver-catalogo-btn"
              onClick={onClose}
              disabled={subiendo}
              style={{ margin: 0 }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="checkout-btn"
              disabled={!archivo || subiendo}
              style={{ margin: 0, minWidth: '160px' }}
            >
              {subiendo ? 'Subiendo...' : 'Guardar Imagen ✨'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
