from pydantic import BaseModel
from typing import Optional

class ProductoBase(BaseModel):
    nombre: str
    precio_final: float
    cuotas_cantidad: int = 1
    cuotas_valor: float = 0.0
    garantia_meses: int = 0
    stock: int = 0
    imagen: Optional[str] = None

class ProductoCreate(ProductoBase):
    pass

class ProductoUpdate(BaseModel):
    nombre: Optional[str] = None
    precio_final: Optional[float] = None
    cuotas_cantidad: Optional[int] = None
    cuotas_valor: Optional[float] = None
    garantia_meses: Optional[int] = None
    stock: Optional[int] = None
    imagen: Optional[str] = None

class ProductoOut(ProductoBase):
    id: int

    class Config:
        from_attributes = True
