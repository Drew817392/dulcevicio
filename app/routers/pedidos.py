from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.usuario import Usuario
from app.models.producto import Producto
from app.models.pedido import Pedido, ItemPedido
from app.schemas.pedido import PedidoCreate, PedidoOut, ItemPedidoOut

router = APIRouter(prefix="/pedidos", tags=["Pedidos"])

@router.post("", response_model=PedidoOut, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=PedidoOut, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def crear_pedido(
    pedido_in: PedidoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    if not pedido_in.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El pedido no puede estar vacío."
        )

    total_calculado = 0.0
    items_a_crear = []

    # 1. Validar existencia y stock de todos los productos primero
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

    # 2. Crear la orden principal
    nuevo_pedido = Pedido(
        usuario_id=current_user.id,
        total=round(total_calculado, 2),
        estado="Confirmado"
    )
    db.add(nuevo_pedido)
    db.flush()  # Para obtener nuevo_pedido.id

    # 3. Crear los ítems de la orden
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
        fecha_creacion=nuevo_pedido.fecha_creacion,
        items=items_out
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
            fecha_creacion=p.fecha_creacion,
            items=items_out
        ))

    return resultados
