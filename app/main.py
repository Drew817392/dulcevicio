import os
from pathlib import Path
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
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

# Middleware de compresión GZip (para respuestas mayores a 1 KB)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Clase para servir estáticos con encabezados de caché inmutable (30 días)
class StaticConCache(StaticFiles):
    async def get_response(self, path, scope):
        respuesta = await super().get_response(path, scope)
        if respuesta.status_code == 200:
            respuesta.headers["Cache-Control"] = "public, max-age=2592000, immutable"
        return respuesta

# Montar archivos estáticos para servir imágenes con caché
app.mount("/static", StaticConCache(directory="uploads"), name="static")
app.mount("/demo", StaticConCache(directory="app/static/demo"), name="demo")

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

from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles

app.add_middleware(GZipMiddleware, minimum_size=1000)

class StaticConCache(StaticFiles):
    async def get_response(self, path, scope):
        respuesta = await super().get_response(path, scope)
        if respuesta.status_code == 200:
            respuesta.headers["Cache-Control"] = "public, max-age=2592000, immutable"
        return respuesta

Path("uploads/productos").mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticConCache(directory="uploads"), name="static")
app.mount("/demo", StaticConCache(directory="app/static/demo"), name="demo")