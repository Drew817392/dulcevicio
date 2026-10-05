from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class ItemPedidoCreate(BaseModel):
    producto_id: int
    cantidad: int = Field(gt=0, description="La cantidad debe ser mayor a 0")

class PedidoCreate(BaseModel):
    items: List[ItemPedidoCreate] = Field(min_length=1, description="El pedido debe tener al menos un ítem")

class ItemPedidoOut(BaseModel):
    id: int
    producto_id: int
    nombre_producto: Optional[str] = None
    cantidad: int
    precio_unitario: float
    subtotal: float

    class Config:
        from_attributes = True

class PedidoOut(BaseModel):
    id: int
    usuario_id: int
    total: float
    estado: str
    codigo_revocacion: Optional[str] = None
    fecha_revocacion: Optional[datetime] = None
    fecha_creacion: datetime
    items: List[ItemPedidoOut]

    class Config:
        from_attributes = True

class RevocacionOut(BaseModel):
    mensaje: str
    codigo_revocacion: str
    pedido_id: int
    estado: str
    fecha_revocacion: datetime

    class Config:
        from_attributes = True

class PedidoAdminOut(BaseModel):
    id: int
    usuario_id: int
    usuario_nombre: Optional[str] = None
    usuario_email: Optional[str] = None
    total: float
    estado: str
    codigo_revocacion: Optional[str] = None
    fecha_revocacion: Optional[datetime] = None
    fecha_creacion: datetime
    items: List[ItemPedidoOut]

    class Config:
        from_attributes = True

