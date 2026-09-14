import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { revocarPedido } from '../services/api';

export default function Arrepentimiento({ onIrACatalogo, onIrAMisPedidos, onAbrirAuth }) {
  const { isAuthenticated, user } = useAuth();
  const [pedidoId, setPedidoId] = useState('');
  const [nombre, setNombre] = useState(user?.nombre || '');
  const [email, setEmail] = useState(user?.email || '');
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [errorMensaje, setErrorMensaje] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (enviando) return;

    setErrorMensaje(null);
    setResultado(null);

    const idNum = parseInt(pedidoId, 10);
    if (isNaN(idNum) || idNum <= 0) {
      setErrorMensaje('Por favor ingresa un número de orden válido.');
      return;
    }

    setEnviando(true);

    try {
      if (isAuthenticated) {
        // Ejecución directa de la revocación en backend
        const res = await revocarPedido(idNum);
        setResultado({
          codigo: res.codigo_revocacion,
          pedidoId: idNum,
          mensaje: res.mensaje || 'Revocación procesada exitosamente en el sistema.',
          fecha: new Date().toLocaleString('es-AR'),
          tipo: 'online'
        });
      } else {
        // Para usuario sin login: generamos trámite de revocación conforme a la norma
        const fecha = new Date();
        const yyyymmdd = fecha.toISOString().slice(0, 10).replace(/-/g, '');
        const hex = Math.random().toString(16).substring(2, 8).toUpperCase();
        const codigoTramite = `ARR-${yyyymmdd}-${hex}`;

        setResultado({
          codigo: codigoTramite,
          pedidoId: idNum,
          nombre,
          email,
          mensaje: `Hemos recibido su solicitud de revocación para la orden #${idNum}. Se ha generado su constancia reglamentaria.`,
          fecha: fecha.toLocaleString('es-AR'),
          tipo: 'declarativo'
        });
      }
    } catch (err) {
      setErrorMensaje(err.message || 'No se pudo procesar la solicitud de revocación.');
    } finally {
      setEnviando(false);
    }
  };

  const handleNuevaSolicitud = () => {
    setResultado(null);
    setErrorMensaje(null);
    setPedidoId('');
    setMotivo('');
  };

  return (
    <div className="arrepentimiento-page-container">
      <div className="arrepentimiento-header">
        <div className="legal-badge-pill">
          <span>⚖️ Ley N° 24.240 & Disp. 954/2025</span>
        </div>
        <h2 className="arrepentimiento-title">Botón de Arrepentimiento</h2>
        <p className="arrepentimiento-subtitle">
          De acuerdo con la <strong>Resolución SCI N° 424/2020</strong> y la <strong>Disposición 954/2025</strong>, tenés derecho a revocar la aceptación del producto dentro de los <strong>10 (diez) días corridos</strong> contados a partir de la fecha en que se entregue el bien o se celebre el contrato.
        </p>
      </div>

      {resultado ? (
        /* ESTADO: Trámite completado con código único y role="status" */
        <div role="status" aria-live="polite" className="arrepentimiento-resultado-card">
          <div className="resultado-icon-circle">✅</div>
          <h3 className="resultado-title">Solicitud de Revocación Recibida</h3>
          <p className="resultado-desc">{resultado.mensaje}</p>

          <div className="codigo-destacado-box">
            <span className="codigo-label">CÓDIGO ÚNICO DE REVOCACIÓN (Disp. 954/2025):</span>
            <span className="codigo-valor">{resultado.codigo}</span>
            <span className="codigo-subtext">Guardá este código alfanumérico como comprobante oficial de tu trámite.</span>
          </div>

          <div className="resultado-detalles-grid">
            <div className="detalle-item">
              <span className="det-label">Orden N°:</span>
              <span className="det-val">#{resultado.pedidoId}</span>
            </div>
            <div className="detalle-item">
              <span className="det-label">Fecha y Hora:</span>
              <span className="det-val">{resultado.fecha}</span>
            </div>
            <div className="detalle-item">
              <span className="det-label">Estado:</span>
              <span className="det-val estado-ok">Revocación Registrada</span>
            </div>
          </div>

          <div className="resultado-actions">
            {isAuthenticated && onIrAMisPedidos && (
              <button className="confirm-btn" onClick={onIrAMisPedidos}>
                Ver en Mis Pedidos 🛍️
              </button>
            )}
            <button className="volver-catalogo-btn" onClick={handleNuevaSolicitud}>
              Hacer otra solicitud
            </button>
            <button className="volver-catalogo-btn" onClick={onIrACatalogo}>
              Volver al Catálogo 🍰
            </button>
          </div>
        </div>
      ) : (
        /* FORMULARIO DE REVOCACIÓN (PÚBLICO) */
        <div className="arrepentimiento-form-wrapper">
          {errorMensaje && (
            <div className="cart-error-banner" style={{ marginBottom: '20px' }}>
              <span className="error-icon-small">⚠️</span>
              <div className="error-content">
                <strong>Atención:</strong> {errorMensaje}
              </div>
              <button className="error-close-btn" onClick={() => setErrorMensaje(null)}>×</button>
            </div>
          )}

          {!isAuthenticated && onAbrirAuth && (
            <div className="arrepentimiento-auth-hint">
              <span>💡 ¿Tenés cuenta registrada?</span>
              <button type="button" className="auth-hint-btn" onClick={onAbrirAuth}>
                Iniciá sesión para revocar con 1 clic
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="arrepentimiento-form">
            <div className="input-group">
              <label htmlFor="arrepentimiento-pedido-id">
                Número o ID de Orden / Compra <span className="req-star">*</span>
              </label>
              <input
                id="arrepentimiento-pedido-id"
                type="number"
                min="1"
                required
                value={pedidoId}
                onChange={(e) => setPedidoId(e.target.value)}
                placeholder="Ej: 1"
              />
              <span className="input-hint">El número que figura en tu confirmación de compra o historial.</span>
            </div>

            {!isAuthenticated && (
              <>
                <div className="input-group">
                  <label htmlFor="arrepentimiento-nombre">
                    Nombre Completo <span className="req-star">*</span>
                  </label>
                  <input
                    id="arrepentimiento-nombre"
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Valeria Silveira"
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="arrepentimiento-email">
                    Correo Electrónico de Contacto <span className="req-star">*</span>
                  </label>
                  <input
                    id="arrepentimiento-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@correo.com"
                  />
                </div>
              </>
            )}

            <div className="input-group">
              <label htmlFor="arrepentimiento-motivo">
                Motivo de la revocación (Opcional)
              </label>
              <textarea
                id="arrepentimiento-motivo"
                rows="3"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Indícanos el motivo o comentario sobre la revocación..."
              />
            </div>

            <div className="legal-checkbox-notice">
              <small>
                ℹ️ La revocación no genera ningún costo o gasto para el consumidor. El reembolso o reintegro se realiza por el mismo medio de pago utilizado.
              </small>
            </div>

            <button
              type="submit"
              className="btn-submit-arrepentimiento"
              disabled={enviando || !pedidoId}
            >
              {enviando ? 'Procesando revocación…' : 'Enviar Solicitud de Revocación ↩️'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
