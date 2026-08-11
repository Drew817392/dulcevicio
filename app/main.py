from fastapi import FastAPI

app = FastAPI(
    title="E-commerce Argentino API",
    description="API para la gestión de un e-commerce argentino, sujeta a la Ley N° 24.240 de Defensa del Consumidor.",
    version="0.1.0",
)

@app.get("/")
async def read_root():
    return {
        "mensaje": "Bienvenido a la API del e-commerce argentino.",
        "regulacion": "Esta API y sus operaciones comerciales están sujetas a la Ley N° 24.240 de Defensa del Consumidor de la República Argentina.",
        "estado": "Operativo"
    }
