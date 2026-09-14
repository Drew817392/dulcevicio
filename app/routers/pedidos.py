import secrets
from datetime import datetime, timedelta, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.usuario import Usuario
from app.models.producto import Producto
from app.models.pedido import Pedido, ItemPedido
from app.schemas.pedido import PedidoCreate, PedidoOut, ItemPedidoOut, RevocacionOut

router = APIRouter(prefix="/pedidos", tags=["Pedidos"])

@router.post("", response_model=PedidoOut, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=PedidoOut, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def crear_pedido(
    pedido_in: PedidoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Checkout Transaccional Seguro (Clase 8):
    - NI precios, NI total, NI usuario_id provienen del frontend.
    - Valida stock en base de datos; si falta stock responde 409 Conflict con detalle.
    - Maneja transacción atómica con try/except y db.rollback().
    - Congela precio_unitario en ItemPedido y calcula total server-side.
    """
    if not pedido_in.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El pedido no puede estar vacío."
        )

    try:
        total_calculado = 0.0
        items_a_crear = []

        # 1. Validar existencia y stock de todos los productos
        for item_in in pedido_in.items:
            producto = db.query(Producto).filter(Producto.id == item_in.producto_id).first()
            if not producto:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Producto con ID {item_in.producto_id} no encontrado."
                )

            # Validar stock disponible
            if producto.stock < item_in.cantidad:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"No hay suficiente stock para '{producto.nombre}'. Disponibles: {producto.stock} unidades."
                )

            # Congelar precio unitario del catálogo y calcular subtotal
            subtotal = round(producto.precio_final * item_in.cantidad, 2)
            total_calculado += subtotal

            # Descontar stock
            producto.stock -= item_in.cantidad

            items_a_crear.append({
                "producto": producto,
                "cantidad": item_in.cantidad,
                "precio_unitario": producto.precio_final,
                "subtotal": subtotal
            })

        # 2. Crear la orden principal asociada al usuario autenticado
        nuevo_pedido = Pedido(
            usuario_id=current_user.id,
            total=round(total_calculado, 2),
            estado="Confirmado"
        )
        db.add(nuevo_pedido)
        db.flush()  # Obtiene el ID del pedido para las claves foráneas

        # 3. Crear los ítems con precio congelado
        items_out = []
        for item_data in items_a_crear:
            item_db = ItemPedido(
                pedido_id=nuevo_pedido.id,
                producto_id=item_data["producto"].id,
                cantidad=item_data["cantidad"],
                precio_unitario=item_data["precio_unitario"],
                subtotal=item_data["subtotal"]
            )
            db.add(item_db)
            db.flush()
            items_out.append(ItemPedidoOut(
                id=item_db.id,
                producto_id=item_data["producto"].id,
                nombre_producto=item_data["producto"].nombre,
                cantidad=item_db.cantidad,
                precio_unitario=item_db.precio_unitario,
                subtotal=item_db.subtotal
            ))

        db.commit()
        db.refresh(nuevo_pedido)

        return PedidoOut(
            id=nuevo_pedido.id,
            usuario_id=nuevo_pedido.usuario_id,
            total=nuevo_pedido.total,
            estado=nuevo_pedido.estado,
            codigo_revocacion=nuevo_pedido.codigo_revocacion,
            fecha_revocacion=nuevo_pedido.fecha_revocacion,
            fecha_creacion=nuevo_pedido.fecha_creacion,
            items=items_out
        )

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al procesar el pedido en el servidor: {str(e)}"
        )

@router.post("/{id}/revocacion", response_model=RevocacionOut, status_code=status.HTTP_201_CREATED)
def revocar_pedido(
    id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Flujo Legal y Revocaciones (Clase 9 - Res. SCI 424/2020 y Disp. 954/2025):
    - a) Valida que el pedido pertenezca al usuario (o 404).
    - b) Valida que no esté previamente cancelado/revocado (o 409).
    - c) Valida que se encuentre dentro de los 10 días corridos con datetimes conscientes de zona horaria (timezone.utc).
    - Genera código único ARR-YYYYMMDD-HEX y reintegra stock dentro de la misma transacción.
    - Retorna HTTP 201 Created.
    """
    # a) Validar existencia y titularidad
    pedido = db.query(Pedido).filter(Pedido.id == id).first()
    if not pedido or pedido.usuario_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pedido no encontrado o no pertenece a la cuenta autenticada."
        )

    # b) Validar estado no cancelado/revocado
    if pedido.estado in ["Cancelado", "Revocado"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El pedido ya ha sido cancelado o revocado previamente."
        )

    # c) Validar plazo legal de 10 días corridos
    ahora = datetime.now(timezone.utc)
    fecha_creacion = pedido.fecha_creacion
    if fecha_creacion.tzinfo is None:
        fecha_creacion = fecha_creacion.replace(tzinfo=timezone.utc)

    dias_transcurridos = (ahora - fecha_creacion).total_seconds() / (24 * 3600)
    if dias_transcurridos > 10.0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El plazo legal de 10 días corridos para revocar la compra ha expirado conforme a la Res. SCI N° 424/2020."
        )

    try:
        # Generar código único ARR-YYYYMMDD-HEX
        codigo_unico = f"ARR-{ahora.strftime('%Y%m%d')}-{secrets.token_hex(4).upper()}"

        pedido.estado = "Revocado"
        pedido.codigo_revocacion = codigo_unico
        pedido.fecha_revocacion = ahora

        # Reintegrar stock a la base de datos
        for item in pedido.items:
            prod = db.query(Producto).filter(Producto.id == item.producto_id).first()
            if prod:
                prod.stock += item.cantidad

        db.commit()
        db.refresh(pedido)

        return RevocacionOut(
            mensaje="Revocación de compra procesada con éxito conforme a la Res. SCI 424/2020 y Disp. 954/2025.",
            codigo_revocacion=codigo_unico,
            pedido_id=pedido.id,
            estado=pedido.estado,
            fecha_revocacion=pedido.fecha_revocacion
        )

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al procesar la revocación: {str(e)}"
        )

@router.get("/mis-pedidos", response_model=List[PedidoOut])
@router.get("", response_model=List[PedidoOut])
@router.get("/", response_model=List[PedidoOut], include_in_schema=False)
def get_mis_pedidos(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    pedidos = (
        db.query(Pedido)
        .filter(Pedido.usuario_id == current_user.id)
        .order_by(Pedido.fecha_creacion.desc())
        .all()
    )

    resultados = []
    for p in pedidos:
        items_out = []
        for it in p.items:
            prod_nombre = it.producto.nombre if it.producto else f"Producto #{it.producto_id}"
            items_out.append(ItemPedidoOut(
                id=it.id,
                producto_id=it.producto_id,
                nombre_producto=prod_nombre,
                cantidad=it.cantidad,
                precio_unitario=it.precio_unitario,
                subtotal=it.subtotal
            ))
        resultados.append(PedidoOut(
            id=p.id,
            usuario_id=p.usuario_id,
            total=p.total,
            estado=p.estado,
            codigo_revocacion=p.codigo_revocacion,
            fecha_revocacion=p.fecha_revocacion,
            fecha_creacion=p.fecha_creacion,
            items=items_out
        ))

    return resultados
