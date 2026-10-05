import os
from pathlib import Path
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.routers import auth, productos, pedidos, usuarios

# Asegurar existencia de los directorios de subidas y estáticos demo
Path("uploads/productos").mkdir(parents=True, exist_ok=True)
Path("app/static/demo").mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="Dulce Vicio API",
    description="API para la gestión del catálogo de postres artesanos de Dulce Vicio, con autenticación JWT, roles y cumplimiento de la Ley N° 25.326 de Protección de Datos Personales y Ley N° 24.240 de Defensa del Consumidor.",
    version="1.0.0",
)

# Montar archivos estáticos para servir imágenes
app.mount("/static", StaticFiles(directory="uploads"), name="static")
app.mount("/demo", StaticFiles(directory="app/static/demo"), name="demo")

# Configuración dinámica de CORS desde variables de entorno
origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Montar routers
app.include_router(auth.router)
app.include_router(productos.router)
app.include_router(pedidos.router)
app.include_router(usuarios.router)


@app.get("/", tags=["General"])
async def read_root():
    return {
        "mensaje": "Bienvenido a la API de postres Dulce Vicio.",
        "regulacion": "Esta API cumple con la Ley N° 25.326 (Protección de Datos Personales) y la Ley N° 24.240 (Defensa del Consumidor).",
        "estado": "Operativo"
    }


@app.get("/salud", tags=["General"])
def check_salud(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"estado": "ok", "base": "ok"}
