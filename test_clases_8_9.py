import urllib.request
import urllib.error
import urllib.parse
import json
import time
from datetime import datetime, timezone, timedelta
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.usuario import Usuario
from app.models.producto import Producto
from app.models.pedido import Pedido, ItemPedido

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
        elif isinstance(data, bytes):
            req_data = data
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            body = response.read().decode('utf-8')
            try:
                return response.status, json.loads(body)
            except Exception:
                return response.status, body
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, body

def run_backend_tests():
    ts = int(time.time())
    db = SessionLocal()

    # Asegurar producto de prueba con stock conocido
    prod = db.query(Producto).filter(Producto.nombre.like("Torta Chocotorta Test%")).first()
    if not prod:
        prod = Producto(
            nombre=f"Torta Chocotorta Test {ts}",
            precio_final=4500.0,
            cuotas_cantidad=3,
            cuotas_valor=1500.0,
            garantia_meses=0,
            stock=5,
            imagen="https://images.unsplash.com/photo-1578985545062-69928b1d9587"
        )
        db.add(prod)
        db.commit()
        db.refresh(prod)
    else:
        prod.stock = 5
        db.commit()
        db.refresh(prod)

    prod_id = prod.id
    prod_nombre = prod.nombre
    stock_inicial = prod.stock
    print(f"[*] Producto de prueba ID {prod_id}: '{prod_nombre}' con stock inicial = {stock_inicial}")

    # 1. Registrar usuario de prueba
    email_test = f"cliente_{ts}@dulcevicio.com"
    st, res_reg = request("http://localhost:8000/auth/register", method="POST", data={
        "nombre": "Cliente Tester",
        "email": email_test,
        "password": "PasswordSeguro123!",
        "acepto_tratamiento": True
    })
    print(f"[1] Registro de usuario ({email_test}) -> Status: {st} (201 esperado)")
    assert st == 201, f"Fallo al registrar: {res_reg}"

    # 2. Login
    form_data = urllib.parse.urlencode({"username": email_test, "password": "PasswordSeguro123!"}).encode("utf-8")
    st, res_login = request("http://localhost:8000/auth/login", method="POST", data=form_data, headers={"Content-Type": "application/x-www-form-urlencoded"})
    print(f"[2] Login de usuario -> Status: {st} (200 esperado)")
    assert st == 200, f"Fallo en login: {res_login}"
    token = res_login["access_token"]
    auth_hdr = {"Authorization": f"Bearer {token}"}

    # 3. Validar checkout con stock insuficiente (HTTP 409)
    st, res_stock_fail = request("http://localhost:8000/pedidos", method="POST", data={
        "items": [{"producto_id": prod_id, "cantidad": 999}]
    }, headers=auth_hdr)
    print(f"[3] Pedido con stock excedido (999 u.) -> Status: {st} (409 Conflict esperado)")
    print(f"    Detalle del error devuelto: {res_stock_fail}")
    assert st == 409, f"Se esperaba 409 y se obtuvo {st}"
    assert "No hay suficiente stock" in res_stock_fail.get("detail", ""), "Mensaje de stock no coincide"

    # 4. Checkout exitoso con cálculo server-side y congelamiento de precio
    st, res_pedido = request("http://localhost:8000/pedidos", method="POST", data={
        "items": [{"producto_id": prod_id, "cantidad": 2}]
    }, headers=auth_hdr)
    print(f"[4] Pedido exitoso de 2 unidades -> Status: {st} (201 Created esperado)")
    assert st == 201, f"Se esperaba 201 y se obtuvo {st}: {res_pedido}"
    pedido_id = res_pedido["id"]
    total_esperado = 4500.0 * 2
    assert res_pedido["total"] == total_esperado, f"Total incorrecto: {res_pedido['total']} != {total_esperado}"
    assert res_pedido["items"][0]["precio_unitario"] == 4500.0
    print(f"    Pedido ID: {pedido_id} | Total calculado: ${res_pedido['total']} | Stock restante esperado: 3")

    # Verificar decremento de stock en DB
    db.expire_all()
    prod_db = db.query(Producto).filter(Producto.id == prod_id).first()
    assert prod_db.stock == 3, f"Stock en DB debería ser 3, pero es {prod_db.stock}"
    print(f"    [OK] Stock verificado en base de datos: {prod_db.stock}")

    # 5. Revocación de compra (Clase 9)
    st, res_revoc = request(f"http://localhost:8000/pedidos/{pedido_id}/revocacion", method="POST", headers=auth_hdr)
    print(f"\n[5] Solicitud de Revocación POST /pedidos/{pedido_id}/revocacion -> Status: {st} (201 Created esperado)")
    print(f"    Código de Revocación generado: {res_revoc.get('codigo_revocacion')}")
    print(f"    Estado del pedido: {res_revoc.get('estado')}")
    assert st == 201, f"Se esperaba 201 y se obtuvo {st}: {res_revoc}"
    assert res_revoc["codigo_revocacion"].startswith("ARR-"), "El código debe iniciar con ARR-"

    # Verificar que el stock se haya reintegrado a 5
    db.expire_all()
    prod_db = db.query(Producto).filter(Producto.id == prod_id).first()
    assert prod_db.stock == 5, f"Stock en DB tras reintegro debería ser 5, pero es {prod_db.stock}"
    print(f"    [OK] Stock reintegrado en base de datos: {prod_db.stock}")

    # 6. Intento de revocar un pedido ya revocado (HTTP 409)
    st, res_dup_revoc = request(f"http://localhost:8000/pedidos/{pedido_id}/revocacion", method="POST", headers=auth_hdr)
    print(f"[6] Intento de revocar pedido ya cancelado -> Status: {st} (409 Conflict esperado)")
    assert st == 409, f"Se esperaba 409 y se obtuvo {st}"

    # 7. Datos Personales y Exportación (Ley 25.326)
    st, res_datos = request("http://localhost:8000/usuarios/me/datos", method="GET", headers=auth_hdr)
    print(f"\n[7] GET /usuarios/me/datos -> Status: {st} (200 OK esperado)")
    assert st == 200, f"Error en datos: {res_datos}"
    print(f"    Datos: {res_datos}")

    st, res_export = request("http://localhost:8000/usuarios/me/exportar", method="GET", headers=auth_hdr)
    print(f"[8] GET /usuarios/me/exportar -> Status: {st} (200 OK esperado)")
    assert st == 200, f"Error en exportar: {res_export}"
    assert "titular_datos" in res_export and "historial_compras" in res_export
    print(f"    Exportacion generada con {len(res_export['historial_compras'])} pedidos en el historial.")

    # 8. Baja lógica / Anonimización de cuenta (DELETE /usuarios/me)
    st, res_baja = request("http://localhost:8000/usuarios/me", method="DELETE", headers=auth_hdr)
    print(f"\n[9] DELETE /usuarios/me -> Status: {st} (200 OK esperado)")
    assert st == 200, f"Error en baja: {res_baja}"
    print(f"    Mensaje: {res_baja.get('mensaje')}")

    # 9. Verificar que get_current_user rechaza al usuario inactivo con 401
    st, res_me_inactive = request("http://localhost:8000/auth/me", method="GET", headers=auth_hdr)
    print(f"[10] GET /auth/me con token de usuario dado de baja -> Status: {st} (401 Unauthorized esperado)")
    assert st == 401, f"Se esperaba 401 y se obtuvo {st}"
    print(f"     Detalle: {res_me_inactive}")

    # 10. Verificar integridad de pedidos en DB
    pedidos_count = db.query(Pedido).filter(Pedido.id == pedido_id).count()
    assert pedidos_count == 1, "Los pedidos deben conservarse en DB por auditoria contable"
    print(f"    [OK] Pedidos conservados en DB para auditoria contable: {pedidos_count} fila(s)")

    db.close()
    print("\n=== TODAS LAS PRUEBAS DE BACKEND (CLASES 8 Y 9) PASARON CON EXITO ===")

if __name__ == "__main__":
    run_backend_tests()
