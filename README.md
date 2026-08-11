# 🍰 E-commerce de Postres - API

API profesional diseñada con FastAPI para gestionar el catálogo y las operaciones comerciales de una tienda de postres artesanos en Argentina. El diseño de este sistema prioriza la simplicidad, la accesibilidad y el estricto cumplimiento del marco regulatorio comercial y digital argentino.

---

## ⚖️ Cumplimiento Normativo (Leyes y Resoluciones)

Para operar de manera legal y ética en el territorio argentino, esta plataforma está diseñada conforme a las siguientes normativas:

1. **Ley N° 24.240 (Defensa del Consumidor):** Garantiza la protección de los derechos de los consumidores en las transacciones comerciales, proveyendo información clara, precisa y gratuita sobre los productos y las condiciones de contratación.
2. **Resolución SCI N° 424/2020 (Botón de Arrepentimiento):** Obliga a incorporar un acceso fácil y directo para que el consumidor pueda revocar la compra en un plazo de 10 días corridos a partir de la entrega del producto o la firma del contrato.
3. **Ley N° 25.326 (Protección de Datos Personales):** Protege la privacidad de los usuarios garantizando el tratamiento lícito de sus datos personales, la seguridad de la información almacenada y el derecho de acceso, rectificación y supresión de los mismos.

---

## 🛠️ Requisitos e Instalación

### Requisitos Previos
* Python 3.12 o superior
* Administrador de paquetes `pip`

### Pasos para la instalación

1. **Clonar o descargar el proyecto:**
   ```bash
   cd fastapi
   ```

2. **Crear un entorno virtual (recomendado):**
   ```bash
   python -m venv .venv
   ```

3. **Activar el entorno virtual:**
   * En **Windows (PowerShell)**:
     ```powershell
     .venv\Scripts\Activate.ps1
     ```
   * En **Windows (CMD)**:
     ```cmd
     .venv\Scripts\activate.bat
     ```
   * En **macOS / Linux**:
     ```bash
     source .venv/bin/activate
     ```

4. **Instalar dependencias:**
   ```bash
   pip install -r requirements.txt
   ```

---

## 🚀 Ejecución del Servidor

Para iniciar la API en entorno de desarrollo con recarga automática, ejecuta:

```bash
uvicorn app.main:app --reload
```

El servidor estará disponible en [http://localhost:8000](http://localhost:8000).

---

## 📖 Documentación Automática

FastAPI provee documentación interactiva autogenerada de manera nativa:

* **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs) (para pruebas interactivas de endpoints).
* **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc) (documentación limpia y estructurada).
