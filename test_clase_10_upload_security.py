import urllib.request
import urllib.error
import urllib.parse
import json
import time
import os
import io
from app.core.database import SessionLocal
from app.models.usuario import Usuario
from app.models.producto import Producto

def request(url, method='GET', data=None, headers=None):
    if headers is None:
        headers = {}
    req_data = None
    if data is not None:
        if isinstance(data, dict):
            req_data = json.dumps(data).encode('utf-8')
            headers['Content-Type'] = 'application/json'
        elif isinstance(data, str):
            req_data = data.encode('utf-8')
        elif isinstance(data, (bytes, bytearray)):
            req_data = bytes(data)
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            body = response.read().decode('utf-8', errors='ignore')
            try:
                return response.status, json.loads(body)
            except Exception:
                return response.status, body
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='ignore')
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, body

def build_multipart_form_data(fields, files):
    boundary = f"----WebKitFormBoundary{int(time.time()*1000)}"
    body = io.BytesIO()
    for key, value in fields.items():
        body.write(f"--{boundary}\r\n".encode())
        body.write(f'Content-Disposition: form-data; name="{key}"\r\n\r\n'.encode())
        body.write(f"{value}\r\n".encode())
    for key, (filename, file_content, content_type) in files.items():
        body.write(f"--{boundary}\r\n".encode())
        body.write(f'Content-Disposition: form-data; name="{key}"; filename="{filename}"\r\n'.encode())
        body.write(f"Content-Type: {content_type}\r\n\r\n".encode())
        body.write(file_content)
        body.write(b"\r\n")
    body.write(f"--{boundary}--\r\n".encode())
    headers = {
        'Content-Type': f'multipart/form-data; boundary={boundary}'
    }
    return body.getvalue(), headers

def run_security_upload_tests():
    ts = int(time.time())
    db = SessionLocal()

    # 1. Crear producto de prueba
    prod = Producto(
        nombre=f"Postre Test Upload {ts}",
        precio_final=3200.0,
        cuotas_cantidad=3,
        cuotas_valor=1066.66,
        garantia_meses=0,
        stock=10,
        imagen="https://images.unsplash.com/photo-1578985545062-69928b1d9587"
    )
    db.add(prod)
    db.commit()
    db.refresh(prod)
    prod_id = prod.id
    print(f"[*] Producto creado para prueba ID {prod_id}: '{prod.nombre}'")

    # 2. Registrar y loguear usuario admin
    admin_email = f"admin_security_{ts}@dulcevicio.com"
    st, _ = request("http://127.0.0.1:8000/auth/register", method="POST", data={
        "nombre": "Admin Security Tester",
        "email": admin_email,
        "password": "PasswordSeguro123!",
        "acepto_tratamiento": True
    })
    assert st == 201

    # Promover a rol admin directamente en BD
    user_db = db.query(Usuario).filter(Usuario.email == admin_email).first()
    user_db.rol = "admin"
    db.commit()

    # Login admin
    form_data = urllib.parse.urlencode({"username": admin_email, "password": "PasswordSeguro123!"}).encode("utf-8")
    st, res_login = request("http://127.0.0.1:8000/auth/login", method="POST", data=form_data, headers={"Content-Type": "application/x-www-form-urlencoded"})
    assert st == 200
    admin_token = res_login["access_token"]
    admin_auth = {"Authorization": f"Bearer {admin_token}"}
    print(f"[1] Admin autenticado con éxito: {admin_email}")

    # 3. Usuario cliente sin permisos
    client_email = f"cliente_normal_{ts}@dulcevicio.com"
    st, _ = request("http://127.0.0.1:8000/auth/register", method="POST", data={
        "nombre": "Cliente Normal",
        "email": client_email,
        "password": "PasswordSeguro123!",
        "acepto_tratamiento": True
    })
    assert st == 201
    form_client = urllib.parse.urlencode({"username": client_email, "password": "PasswordSeguro123!"}).encode("utf-8")
    st, res_clogin = request("http://127.0.0.1:8000/auth/login", method="POST", data=form_client, headers={"Content-Type": "application/x-www-form-urlencoded"})
    client_token = res_clogin["access_token"]
    client_auth = {"Authorization": f"Bearer {client_token}"}

    # TEST A: Intento de subida con usuario no admin (403 Forbidden)
    png_bytes = b"\x89PNG\r\n\x1a\n" + b"\x00" * 200
    body, hdrs = build_multipart_form_data({}, {"archivo": ("torta.png", png_bytes, "image/png")})
    hdrs.update(client_auth)
    st, res_forb = request(f"http://127.0.0.1:8000/productos/{prod_id}/imagen", method="POST", data=body, headers=hdrs)
    print(f"[2] Intento de subida con rol customer -> Status: {st} (403 Forbidden esperado)")
    assert st == 403, f"Se esperaba 403 y se obtuvo {st}"

    # TEST B: Subida a producto inexistente (404 Not Found)
    body, hdrs = build_multipart_form_data({}, {"archivo": ("torta.png", png_bytes, "image/png")})
    hdrs.update(admin_auth)
    st, res_404 = request("http://127.0.0.1:8000/productos/999999/imagen", method="POST", data=body, headers=hdrs)
    print(f"[3] Subida a producto inexistente -> Status: {st} (404 Not Found esperado)")
    assert st == 404, f"Se esperaba 404 y se obtuvo {st}"

    # TEST C: Validación 1 - Extensión inválida (.txt / .php / .exe) (415 Unsupported Media Type)
    body, hdrs = build_multipart_form_data({}, {"archivo": ("payload.txt", b"Texto plano no permitido", "text/plain")})
    hdrs.update(admin_auth)
    st, res_ext = request(f"http://127.0.0.1:8000/productos/{prod_id}/imagen", method="POST", data=body, headers=hdrs)
    print(f"[4] Subida de archivo con extensión inválida (.txt) -> Status: {st} (415 Unsupported Media Type esperado)")
    assert st == 415, f"Se esperaba 415 y se obtuvo {st}"

    # TEST D: Validación 2 - Tamaño superior a 2 MB (413 Request Entity Too Large)
    big_content = b"\xff\xd8\xff" + b"\x00" * (2 * 1024 * 1024 + 100) # 2 MB + 100 bytes
    body, hdrs = build_multipart_form_data({}, {"archivo": ("foto_grande.jpg", big_content, "image/jpeg")})
    hdrs.update(admin_auth)
    st, res_big = request(f"http://127.0.0.1:8000/productos/{prod_id}/imagen", method="POST", data=body, headers=hdrs)
    print(f"[5] Subida de archivo que excede 2 MB -> Status: {st} (413 Request Entity Too Large esperado)")
    assert st == 413, f"Se esperaba 413 y se obtuvo {st}"

    # TEST E: Validación 3 - Archivo trampa (.jpg con contenido de texto falso, magic numbers inválidos) (415)
    fake_jpg = b"Esto no es una imagen real, es un script malicioso disfrazado de jpg"
    body, hdrs = build_multipart_form_data({}, {"archivo": ("torta_trampa.jpg", fake_jpg, "image/jpeg")})
    hdrs.update(admin_auth)
    st, res_trap = request(f"http://127.0.0.1:8000/productos/{prod_id}/imagen", method="POST", data=body, headers=hdrs)
    print(f"[6] Archivo trampa (extensión .jpg con magic numbers falsos) -> Status: {st} (415 Unsupported Media Type esperado)")
    assert st == 415, f"Se esperaba 415 y se obtuvo {st}"

    # TEST F: Subida exitosa de imagen real PNG
    valid_png = b"\x89PNG\r\n\x1a\n" + b"\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
    body, hdrs = build_multipart_form_data({}, {"archivo": ("mifoto_original.png", valid_png, "image/png")})
    hdrs.update(admin_auth)
    st, res_ok = request(f"http://127.0.0.1:8000/productos/{prod_id}/imagen", method="POST", data=body, headers=hdrs)
    print(f"[7] Subida exitosa de imagen PNG válida -> Status: {st} (200 OK esperado)")
    assert st == 200, f"Se esperaba 200 y se obtuvo {st}: {res_ok}"
    imagen_url = res_ok.get("imagen_url")
    print(f"    URL generada: {imagen_url}")
    assert imagen_url.startswith("/static/productos/"), "La imagen_url debe tener el prefijo /static/productos/"
    assert f"{prod_id}-" in imagen_url, "El nombre de archivo debe incluir el producto_id"
    assert "mifoto_original.png" not in imagen_url, "NUNCA debe usarse el filename original"

    # TEST G: Comprobar que StaticFiles sirve la imagen correctamente
    st, static_res = request(f"http://127.0.0.1:8000{imagen_url}", method="GET")
    print(f"[8] GET a la ruta estática {imagen_url} -> Status: {st} (200 OK esperado)")
    assert st == 200, f"Se esperaba 200 y se obtuvo {st}"

    # TEST H: Subida exitosa de imagen real WebP (inicia con RIFF)
    valid_webp = b"RIFF\x1a\x00\x00\x00WEBPVP8 \x0e\x00\x00\x00" + b"\x00" * 50
    body, hdrs = build_multipart_form_data({}, {"archivo": ("postre_webp.webp", valid_webp, "image/webp")})
    hdrs.update(admin_auth)
    st, res_webp = request(f"http://127.0.0.1:8000/productos/{prod_id}/imagen", method="POST", data=body, headers=hdrs)
    print(f"[9] Subida exitosa de imagen WebP válida -> Status: {st} (200 OK esperado)")
    assert st == 200, f"Se esperaba 200 y se obtuvo {st}: {res_webp}"

    db.close()
    print("\n=== TODAS LAS PRUEBAS DE SEGURIDAD Y SUBIDA DE IMÁGENES (CLASE 10) PASARON CON ÉXITO ===")

if __name__ == "__main__":
    run_security_upload_tests()
