import os
import secrets
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies import require_admin
from app.models.producto import Producto as ProductoModel
from app.schemas.producto import ProductoCreate, ProductoUpdate, ProductoOut
from app.utils.archivos import parece_imagen

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

@router.post("/{producto_id}/imagen", response_model=ProductoOut, status_code=status.HTTP_200_OK)
@router.post("/{producto_id}/imagen/", response_model=ProductoOut, status_code=status.HTTP_200_OK, include_in_schema=False)
async def subir_imagen_producto(
    producto_id: int,
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin_user = Depends(require_admin)
):
    """
    Subida segura de imágenes para productos (Clase 10):
    - Requiere rol admin.
    - 3 validaciones estrictas (de la más barata a la más cara):
      1) Extensión de archivo permitida (.jpg, .jpeg, .png, .webp).
      2) Tamaño máximo menor o igual a 2 MB.
      3) Validación de magic numbers (firma real de bytes).
    - Nombre seguro: {producto_id}-{secrets.token_hex(8)}{ext}.
    - Almacenamiento en uploads/productos/.
    """
    # 0. Validar existencia del producto en BD
    producto = db.query(ProductoModel).filter(ProductoModel.id == producto_id).first()
    if not producto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado."
        )

    # 1. Validación de extensión (más barata)
    nombre_original = archivo.filename or ""
    ext = os.path.splitext(nombre_original)[1].lower()
    extensiones_permitidas = [".jpg", ".jpeg", ".png", ".webp"]
    if ext not in extensiones_permitidas:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Extensión de archivo '{ext}' no permitida. Solo se aceptan formatos .jpg, .jpeg, .png y .webp."
        )

    # 2. Validación de tamaño máximo (<= 2 MB)
    contenido = await archivo.read()
    max_bytes = 2 * 1024 * 1024  # 2 MB = 2097152 bytes
    if len(contenido) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE if hasattr(status, "HTTP_413_PAYLOAD_TOO_LARGE") else 413,
            detail="El archivo supera el tamaño máximo permitido de 2 MB."
        )


    # 3. Validación de firma real de bytes (magic numbers)
    if not parece_imagen(contenido):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="El contenido del archivo no corresponde a una imagen válida (firma de bytes incompatible)."
        )

    # Generación de nombre seguro aleatorizado (nunca usar archivo.filename directo)
    nombre_seguro = f"{producto_id}-{secrets.token_hex(8)}{ext}"
    
    # Guardar en uploads/productos/
    upload_dir = os.path.join(os.getcwd(), "uploads", "productos")
    os.makedirs(upload_dir, exist_ok=True)
    ruta_destino = os.path.join(upload_dir, nombre_seguro)

    with open(ruta_destino, "wb") as f:
        f.write(contenido)

    # Actualizar producto en la base de datos con ruta relativa accesible vía StaticFiles
    producto.imagen_url = f"/static/productos/{nombre_seguro}"
    db.commit()
    db.refresh(producto)

    return producto

