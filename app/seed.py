import os
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.core.security import hash_password
from app.models.usuario import Usuario
from app.models.producto import Producto

DEMO_PRODUCTOS = [
    {
        "nombre": "Chocotorta Clásica",
        "precio_final": 18500.0,
        "cuotas_cantidad": 3,
        "cuotas_valor": 6166.67,
        "garantia_meses": 0,
        "stock": 15,
        "imagen": "/demo/chocotorta.jpg",
        "imagen_url": "/demo/chocotorta.jpg"
    },
    {
        "nombre": "Lemon Pie Artesanal",
        "precio_final": 16200.0,
        "cuotas_cantidad": 3,
        "cuotas_valor": 5400.0,
        "garantia_meses": 0,
        "stock": 10,
        "imagen": "/demo/lemon_pie.jpg",
        "imagen_url": "/demo/lemon_pie.jpg"
    },
    {
        "nombre": "Cheesecake de Frutos Rojos",
        "precio_final": 21000.0,
        "cuotas_cantidad": 6,
        "cuotas_valor": 3500.0,
        "garantia_meses": 0,
        "stock": 12,
        "imagen": "/demo/cheesecake_frutos_rojos.jpg",
        "imagen_url": "/demo/cheesecake_frutos_rojos.jpg"
    },
    {
        "nombre": "Tiramisú Tradicional",
        "precio_final": 19800.0,
        "cuotas_cantidad": 3,
        "cuotas_valor": 6600.0,
        "garantia_meses": 0,
        "stock": 8,
        "imagen": "/demo/tiramisu_italiano.jpg",
        "imagen_url": "/demo/tiramisu_italiano.jpg"
    },
    {
        "nombre": "Brownie Bombón con Dulce de Leche",
        "precio_final": 14500.0,
        "cuotas_cantidad": 3,
        "cuotas_valor": 4833.33,
        "garantia_meses": 0,
        "stock": 20,
        "imagen": "/demo/brownie_dulce_de_leche.jpg",
        "imagen_url": "/demo/brownie_dulce_de_leche.jpg"
    },
    {
        "nombre": "Flan Casero Mixto",
        "precio_final": 12000.0,
        "cuotas_cantidad": 1,
        "cuotas_valor": 12000.0,
        "garantia_meses": 0,
        "stock": 14,
        "imagen": "/demo/flan_casero.jpg",
        "imagen_url": "/demo/flan_casero.jpg"
    },
]


def seed_database():
    """
    Script de inicializacion idempotente (seed).
    Crea las tablas si no existen, asegura la existencia del usuario administrador
    y puebla el catalogo con productos demo apuntando a /demo/.
    """
    print("[SEED] Iniciando proceso de carga inicial...")
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # 1. Sembrar Administrador
        admin_email = os.getenv("SEED_ADMIN_EMAIL", "admin@dulcevicio.com").strip()
        admin_password = os.getenv("SEED_ADMIN_PASSWORD", "AdminPass123!").strip()

        admin_existente = db.query(Usuario).filter(Usuario.email == admin_email).first()
        if not admin_existente:
            admin_user = Usuario(
                nombre="Administrador Dulce Vicio",
                email=admin_email,
                hashed_password=hash_password(admin_password),
                rol="admin",
                acepto_tratamiento=True,
                activo=True
            )
            db.add(admin_user)
            print(f"[+] Usuario Administrador creado: {admin_email}")
        else:
            admin_existente.hashed_password = hash_password(admin_password)
            admin_existente.rol = "admin"
            admin_existente.activo = True
            print(f"[*] Usuario Administrador ya existente actualizado: {admin_email}")

        # 2. Sembrar Productos Demo
        for item in DEMO_PRODUCTOS:
            prod = db.query(Producto).filter(Producto.nombre == item["nombre"]).first()
            if not prod:
                nuevo_prod = Producto(
                    nombre=item["nombre"],
                    precio_final=item["precio_final"],
                    cuotas_cantidad=item["cuotas_cantidad"],
                    cuotas_valor=item["cuotas_valor"],
                    garantia_meses=item["garantia_meses"],
                    stock=item["stock"],
                    imagen=item["imagen"],
                    imagen_url=item["imagen_url"]
                )
                db.add(nuevo_prod)
                print(f"[+] Producto creado: {item['nombre']} (imagen: {item['imagen_url']})")
            else:
                prod.precio_final = item["precio_final"]
                prod.cuotas_cantidad = item["cuotas_cantidad"]
                prod.cuotas_valor = item["cuotas_valor"]
                prod.garantia_meses = item["garantia_meses"]
                prod.stock = item["stock"]
                prod.imagen = item["imagen"]
                prod.imagen_url = item["imagen_url"]
                print(f"[*] Producto existente actualizado: {item['nombre']} (imagen: {item['imagen_url']})")

        db.commit()
        print("[OK] Proceso de seed finalizado exitosamente e idempotente.")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Ocurrio un error durante el seed: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
