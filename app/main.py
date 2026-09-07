# pyrefly: ignore [missing-import]
from fastapi import FastAPI

# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, productos

app = FastAPI(
    title="Dulce Vicio API",
    description="API para la gestión del catálogo de postres artesanos de Dulce Vicio, con autenticación JWT, roles y cumplimiento de la Ley N° 25.326 de Protección de Datos Personales y Ley N° 24.240 de Defensa del Consumidor.",
    version="1.0.0",
)

# Configuración de CORS
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

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

@app.get("/", tags=["General"])
async def read_root():
    return {
        "mensaje": "Bienvenido a la API de postres Dulce Vicio.",
        "regulacion": "Esta API cumple con la Ley N° 25.326 (Protección de Datos Personales) y la Ley N° 24.240 (Defensa del Consumidor).",
        "estado": "Operativo"
    }
