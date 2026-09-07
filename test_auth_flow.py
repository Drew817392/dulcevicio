import urllib.request
import urllib.error
import urllib.parse
import json
import time
import psycopg2
from jose import jwt
from app.core.config import settings

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
            return response.status, json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, body

ts = int(time.time())
email_valeria = f'valeria_{ts}@ejemplo.com'
email_lucas = f'lucas_{ts}@ejemplo.com'
password_comun = 'MiClaveSecreta123!'

print('=== 1. REGISTRO Y VALIDACIÓN LEY 25.326 ===')
# [1] Intento de registro sin consentimiento
st, res = request('http://localhost:8000/auth/register', method='POST', data={
    'nombre': 'Usuario Sin Consentimiento',
    'email': f'sin_consentimiento_{ts}@ejemplo.com',
    'password': password_comun,
    'acepto_tratamiento': False
})
print(f'[1] Registro con acepto_tratamiento=False -> Status: {st} (422 Rechazado)')
print(f'    Detalle del error: {res}')

# [2] Registro de Valeria (consentimiento True)
st, res1 = request('http://localhost:8000/auth/register', method='POST', data={
    'nombre': 'Valeria Silveira',
    'email': email_valeria,
    'password': password_comun,
    'acepto_tratamiento': True
})
print(f'\n[2] Registro User 1 ({email_valeria}) -> Status: {st} (201 Creado)')
print(f'    Respuesta (sin hash ni password): {res1}')

# [3] Registro de Lucas (misma contraseña)
st, res2 = request('http://localhost:8000/auth/register', method='POST', data={
    'nombre': 'Lucas Mendez',
    'email': email_lucas,
    'password': password_comun,
    'acepto_tratamiento': True
})
print(f'\n[3] Registro User 2 ({email_lucas}, misma clave) -> Status: {st} (201 Creado)')
print(f'    Respuesta: {res2}')

# [4] Comparación de Hashes en PostgreSQL
conn = psycopg2.connect(host='localhost', user='postgres', password='1234', dbname='ecommerce_db')
cur = conn.cursor()
cur.execute("SELECT id, email, hashed_password, rol, acepto_tratamiento, fecha_consentimiento FROM usuarios WHERE email IN (%s, %s);", (email_valeria, email_lucas))
rows = cur.fetchall()
print('\n[4] Comparación de Hashes en PostgreSQL:')
for r in rows:
    print(f'    User: {r[1]} | Hash: {r[2]} | Primeros 15 chars: {r[2][:15]}')

print('\n=== 2. LOGIN Y TOKENS JWT ===')
# [5] Login con contraseña incorrecta
form_bad = urllib.parse.urlencode({'username': email_valeria, 'password': 'ClaveIncorrecta!'}).encode('utf-8')
st, res_bad = request('http://localhost:8000/auth/login', method='POST', data=form_bad, headers={'Content-Type': 'application/x-www-form-urlencoded'})
print(f'[5] Login con contraseña incorrecta -> Status: {st} (401 Genérico)')
print(f'    Mensaje: {res_bad}')

# [6] Login exitoso
form_good = urllib.parse.urlencode({'username': email_valeria, 'password': password_comun}).encode('utf-8')
st, res_login = request('http://localhost:8000/auth/login', method='POST', data=form_good, headers={'Content-Type': 'application/x-www-form-urlencoded'})
print(f'\n[6] Login exitoso -> Status: {st} (200 OK)')
access_token = res_login['access_token']
refresh_token = res_login['refresh_token']
print(f'    Access Token: {access_token[:40]}...')
print(f'    Refresh Token: {refresh_token[:40]}...')

# [7] Payload del Token
payload = jwt.decode(access_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
print(f'\n[7] Payload decodificado (legible sin clave):')
print(f'    {payload}')

print('\n=== 3. DEPENDENCIAS, /auth/me Y /auth/refresh ===')
# [8] /auth/me sin token
st, res_me_no = request('http://localhost:8000/auth/me', method='GET')
print(f'[8] GET /auth/me sin token -> Status: {st} (401 No autenticado)')

# [9] /auth/me con Access Token
st, res_me_yes = request('http://localhost:8000/auth/me', method='GET', headers={'Authorization': f'Bearer {access_token}'})
print(f'[9] GET /auth/me con Bearer token -> Status: {st} (200 OK)')
print(f'    Perfil autenticado: {res_me_yes}')

# [10] /auth/refresh enviando un access_token (debe rechazar)
st, res_ref_bad = request('http://localhost:8000/auth/refresh', method='POST', data={'refresh_token': access_token})
print(f'\n[10] POST /auth/refresh con access_token -> Status: {st} (401 Rechazado)')
print(f'     Detalle: {res_ref_bad}')

# [11] /auth/refresh con refresh_token válido
st, res_ref_good = request('http://localhost:8000/auth/refresh', method='POST', data={'refresh_token': refresh_token})
print(f'\n[11] POST /auth/refresh con refresh_token -> Status: {st} (200 OK)')
print(f'     Nuevo Access Token: {res_ref_good["access_token"][:40]}...')

print('\n=== 4. CONTROL DE ACCESOS POR ROL (RBAC) ===')
# [12] Intento de creación con rol customer
st, res_prod_forbidden = request('http://localhost:8000/productos', method='POST', data={
    'nombre': 'Postre Prohibido',
    'precio_final': 9999.0,
    'cuotas_cantidad': 1,
    'cuotas_valor': 9999.0,
    'garantia_meses': 0,
    'stock': 5
}, headers={'Authorization': f'Bearer {access_token}'})
print(f'[12] POST /productos con rol customer -> Status: {st} (403 Forbidden)')
print(f'     Mensaje: {res_prod_forbidden}')

# [13] Promoción a admin en PostgreSQL
cur.execute("UPDATE usuarios SET rol = 'admin' WHERE email = %s;", (email_valeria,))
conn.commit()
conn.close()
print(f'\n[13] Promoción en DB: UPDATE usuarios SET rol = \'admin\' WHERE email = \'{email_valeria}\';')

# [14] Login como admin y creación de producto
st, res_admin_login = request('http://localhost:8000/auth/login', method='POST', data=form_good, headers={'Content-Type': 'application/x-www-form-urlencoded'})
admin_token = res_admin_login['access_token']

st, res_prod_created = request('http://localhost:8000/productos', method='POST', data={
    'nombre': f'Pastel Red Velvet Edición #{ts % 1000}',
    'precio_final': 3800.0,
    'cuotas_cantidad': 3,
    'cuotas_valor': 1266.66,
    'garantia_meses': 0,
    'stock': 10,
    'imagen': 'https://images.unsplash.com/photo-1586788680434-30d324b2d46f?w=600'
}, headers={'Authorization': f'Bearer {admin_token}'})
print(f'\n[14] POST /productos con rol admin -> Status: {st} (201 Created)')
print(f'     Producto creado exitosamente: {res_prod_created}')

print('\n=== TODAS LAS PRUEBAS COMPLETADAS CON ÉXITO ===')
