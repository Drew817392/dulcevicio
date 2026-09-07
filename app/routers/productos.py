from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies import require_admin
from app.models.producto import Producto as ProductoModel
from app.schemas.producto import ProductoCreate, ProductoUpdate, ProductoOut

router = APIRouter(prefix="/productos", tags=["Productos"])

@router.get("", response_model=List[ProductoOut])
@router.get("/", response_model=List[ProductoOut], include_in_schema=False)
def list_productos(
    page: int = 0,
    limit: int = 10,
    nombre: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(ProductoModel)
    if nombre:
        query = query.filter(ProductoModel.nombre.ilike(f"%{nombre}%"))
    
    offset = page * limit
    productos = query.offset(offset).limit(limit).all()
    return productos

@router.get("/{producto_id}", response_model=ProductoOut)
def get_producto(producto_id: int, db: Session = Depends(get_db)):
    producto = db.query(ProductoModel).filter(ProductoModel.id == producto_id).first()
    if not producto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado."
        )
    return producto

@router.post("", response_model=ProductoOut, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=ProductoOut, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_producto(
    producto_in: ProductoCreate,
    db: Session = Depends(get_db),
    admin_user = Depends(require_admin)
):
    nuevo_producto = ProductoModel(**producto_in.model_dump())
    db.add(nuevo_producto)
    db.commit()
    db.refresh(nuevo_producto)
    return nuevo_producto

@router.put("/{producto_id}", response_model=ProductoOut)
def update_producto(
    producto_id: int,
    producto_in: ProductoUpdate,
    db: Session = Depends(get_db),
    admin_user = Depends(require_admin)
):
    producto = db.query(ProductoModel).filter(ProductoModel.id == producto_id).first()
    if not producto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado."
        )
    
    update_data = producto_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(producto, field, value)
    
    db.commit()
    db.refresh(producto)
    return producto

@router.delete("/{producto_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_producto(
    producto_id: int,
    db: Session = Depends(get_db),
    admin_user = Depends(require_admin)
):
    producto = db.query(ProductoModel).filter(ProductoModel.id == producto_id).first()
    if not producto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado."
        )
    db.delete(producto)
    db.commit()
    return None
