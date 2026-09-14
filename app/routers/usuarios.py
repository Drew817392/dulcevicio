import json
import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.usuario import Usuario
from app.models.pedido import Pedido
from app.schemas.usuario import UsuarioDatosOut, BajaUsuarioOut

router = APIRouter(prefix="/usuarios", tags=["Usuarios y Privacidad"])

@router.get("/me/datos", response_model=UsuarioDatosOut)
def get_mis_datos(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Derecho de Acceso (Ley N° 25.326 de Protección de Datos Personales):
    Retorna los datos del titular almacenados en el sistema junto con el conteo de pedidos.
    """
    total_pedidos = db.query(Pedido).filter(Pedido.usuario_id == current_user.id).count()

    return UsuarioDatosOut(
        id=current_user.id,
        nombre=current_user.nombre,
        email=current_user.email,
        rol=current_user.rol,
        activo=current_user.activo,
        acepto_tratamiento=current_user.acepto_tratamiento,
        fecha_consentimiento=current_user.fecha_consentimiento,
        fecha_baja=current_user.fecha_baja,
        total_pedidos=total_pedidos
    )

@router.get("/me/exportar")
def exportar_mis_datos(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Portabilidad y Acceso a Datos Personales (Ley N° 25.326, Art. 14):
    Genera y descarga un archivo JSON estructurado con el perfil completo y el historial de compras.
    """
    pedidos = (
        db.query(Pedido)
        .filter(Pedido.usuario_id == current_user.id)
        .order_by(Pedido.fecha_creacion.desc())
        .all()
    )

    pedidos_data = []
    for p in pedidos:
        pedidos_data.append({
            "pedido_id": p.id,
            "total": p.total,
            "estado": p.estado,
            "codigo_revocacion": p.codigo_revocacion,
            "fecha_revocacion": p.fecha_revocacion.isoformat() if p.fecha_revocacion else None,
            "fecha_creacion": p.fecha_creacion.isoformat() if p.fecha_creacion else None,
            "items": [
                {
                    "item_id": it.id,
                    "producto_id": it.producto_id,
                    "nombre_producto": it.producto.nombre if it.producto else f"Producto #{it.producto_id}",
                    "cantidad": it.cantidad,
                    "precio_unitario": it.precio_unitario,
                    "subtotal": it.subtotal
                }
                for it in p.items
            ]
        })

    datos_exportados = {
        "metadatos": {
            "plataforma": "Dulce Vicio E-Commerce",
            "marco_legal": "Ley N° 25.326 de Protección de Datos Personales (República Argentina)",
            "fecha_exportacion": datetime.now(timezone.utc).isoformat(),
        },
        "titular_datos": {
            "id": current_user.id,
            "nombre": current_user.nombre,
            "email": current_user.email,
            "rol": current_user.rol,
            "activo": current_user.activo,
            "acepto_tratamiento": current_user.acepto_tratamiento,
            "fecha_consentimiento": current_user.fecha_consentimiento.isoformat() if current_user.fecha_consentimiento else None,
            "fecha_baja": current_user.fecha_baja.isoformat() if current_user.fecha_baja else None
        },
        "historial_compras": pedidos_data
    }

    json_str = json.dumps(datos_exportados, indent=2, ensure_ascii=False)

    return Response(
        content=json_str,
        media_type="application/json",
        headers={
            "Content-Disposition": f"attachment; filename=mis_datos_usuario_{current_user.id}.json"
        }
    )

@router.delete("/me", response_model=BajaUsuarioOut)
def dar_de_baja_cuenta(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Derecho de Supresión / Baja Lógica y Anonimización (Ley 25.326):
    - Borra datos identificables (nombre, email, password).
    - Marca activo = False y asigna fecha_baja.
    - Conserva las filas de pedidos por auditoría contable.
    - Maneja transacción con try/except y db.rollback() ante fallos.
    """
    try:
        user_id = current_user.id
        # Anonimizar datos identificables
        current_user.nombre = f"Usuario Anonimizado #{user_id}"
        # Se genera un correo anonimizado único para evitar conflictos con UNIQUE en base de datos
        current_user.email = f"anonimo_{user_id}_{secrets.token_hex(4)}@dulcevicio.local"
        current_user.hashed_password = f"ANON_{secrets.token_hex(16)}"
        current_user.activo = False
        current_user.fecha_baja = datetime.now(timezone.utc)

        db.commit()
        db.refresh(current_user)

        return BajaUsuarioOut(
            mensaje="Cuenta anonimizada y dada de baja exitosamente conforme a la Ley 25.326. Sus compras se conservan disociadas para auditoría contable.",
            usuario_id=user_id,
            activo=current_user.activo,
            fecha_baja=current_user.fecha_baja
        )

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al procesar la baja y anonimización de la cuenta: {str(e)}"
        )
