from sqlalchemy import Column, Integer, String, Float
from app.core.database import Base

class Producto(Base):
    __tablename__ = "productos"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    precio_final = Column(Float, nullable=False)
    cuotas_cantidad = Column(Integer, nullable=False, default=1)
    cuotas_valor = Column(Float, nullable=False, default=0.0)
    garantia_meses = Column(Integer, nullable=False, default=0)
    stock = Column(Integer, nullable=False, default=0)
    imagen = Column(String, nullable=True)
