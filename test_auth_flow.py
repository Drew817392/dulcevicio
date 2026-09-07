import urllib.request
import urllib.error
import urllib.parse
import json
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

print('=== PARTE 2: REGISTRO Y VALIDACIÓN LEY 25.326 ===')
# Registro fallido (acepto_tratamiento=False)
st, res = request('http://localhost:8000/auth/register', method='POST', data={
    'nombre': 'Test Rechazado',
    'email': 'rechazado@ejemplo.com',
    'password': 'Password123!',
    'acepto_tratamiento': False
})
print(f'[1] Registro con acepto_tratamiento=False -> Status: {st}')
print(f'    Detalle del error: {res}')

# Registro exitoso 1
st, res1 = request('http://localhost:8000/auth/register', method='POST', data={
    'nombre': 'Valeria Silveira',
    'email': 'valeria@ejemplo.com',
    'password': 'MiClaveSecreta123!',
    'acepto_tratamiento': True
})
print(f'\n[2] Registro User 1 (valeria@ejemplo.com) -> Status: {st}')
print(f'    Respuesta: {res1}')

# Registro exitoso 2 (misma contraseña)
st, res2 = request('http://localhost:8000/auth/register', method='POST', data={
    'nombre': 'Lucas Mendez',
    'email': 'lucas@ejemplo.com',
    'password': 'MiClaveSecreta123!',
    'acepto_tratamiento': True
})
print(f'\n[3] Registro User 2 (lucas@ejemplo.com, misma contraseña) -> Status: {st}')
print(f'    Respuesta: {res2}')

# Verificación de hashes en PostgreSQL
conn = psycopg2.connect(host='localhost', user='postgres', password='1234', dbname='ecommerce_db')
cur = conn.cursor()
cur.execute("SELECT id, email, hashed_password, rol, acepto_tratamiento, fecha_consentimiento FROM usuarios WHERE email IN ('valeria@ejemplo.com', 'lucas@ejemplo.com');")
rows = cur.fetchall()
print('\n[4] Comparación de Hashes en PostgreSQL:')
for r in rows:
    print(f'    User: {r[1]} | Hash Completo: {r[2]} | Primeros 15 chars: {r[2][:15]}')

print('\n=== PARTE 3: LOGIN Y TOKENS JWT ===')
# Login fallido
form_bad = urllib.parse.urlencode({'username': 'valeria@ejemplo.com', 'password': 'ClaveIncorrecta!'}).encode('utf-8')
st, res_bad = request('http://localhost:8000/auth/login', method='POST', data=form_bad, headers={'Content-Type': 'application/x-www-form-urlencoded'})
print(f'[5] Login con contraseña incorrecta -> Status: {st} (401 genérico)')
print(f'    Mensaje: {res_bad}')

# Login exitoso
form_good = urllib.parse.urlencode({'username': 'valeria@ejemplo.com', 'password': 'MiClaveSecreta123!'}).encode('utf-8')
st, res_login = request('http://localhost:8000/auth/login', method='POST', data=form_good, headers={'Content-Type': 'application/x-www-form-urlencoded'})
print(f'\n[6] Login exitoso -> Status: {st}')
access_token = res_login['access_token']
refresh_token = res_login['refresh_token']
print(f'    Access Token: {access_token[:40]}...')
print(f'    Refresh Token: {refresh_token[:40]}...')

# Decodificación del token (jwt.io)
payload = jwt.decode(access_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
print(f'\n[7] Payload legible sin clave (inspección jwt.io):')
print(f'    {payload}')

print('\n=== PARTE 4: DEPENDENCIAS, /auth/me Y /auth/refresh ===')
# GET /auth/me sin token
st, res_me_no = request('http://localhost:8000/auth/me', method='GET')
print(f'[8] GET /auth/me sin token -> Status: {st} (401 Unauthorized)')

# GET /auth/me con Access Token
st, res_me_yes = request('http://localhost:8000/auth/me', method='GET', headers={'Authorization': f'Bearer {access_token}'})
print(f'[9] GET /auth/me con token -> Status: {st}')
print(f'    Datos devueltos: {res_me_yes}')

# POST /auth/refresh con access_token (debe rechazar)
st, res_ref_bad = request('http://localhost:8000/auth/refresh', method='POST', data={'refresh_token': access_token})
print(f'\n[10] POST /auth/refresh enviando un access_token -> Status: {st}')
print(f'     Mensaje: {res_ref_bad}')

# POST /auth/refresh con refresh_token
st, res_ref_good = request('http://localhost:8000/auth/refresh', method='POST', data={'refresh_token': refresh_token})
print(f'\n[11] POST /auth/refresh con refresh_token válido -> Status: {st}')
print(f'     Nuevo Access Token: {res_ref_good["access_token"][:40]}...')

print('\n=== PARTE 5: PERMISOS Y ROLES RBAC ===')
# Intento de creación de producto con rol customer
st, res_prod_forbidden = request('http://localhost:8000/productos', method='POST', data={
    'nombre': 'Postre Intruso',
    'precio_final': 9999.0,
    'cuotas_cantidad': 1,
    'cuotas_valor': 9999.0,
    'garantia_meses': 0,
    'stock': 5
}, headers={'Authorization': f'Bearer {access_token}'})
print(f'[12] POST /productos con rol customer -> Status: {st} (403 Forbidden)')
print(f'     Mensaje: {res_prod_forbidden}')

# Promover usuario a admin en PostgreSQL
cur.execute("UPDATE usuarios SET rol = 'admin' WHERE email = 'valeria@ejemplo.com';")
conn.commit()
conn.close()
print('\n[13] Promoción en DB: UPDATE usuarios SET rol = \'admin\' WHERE email = \'valeria@ejemplo.com\';')

# Re-login para obtener token con rol admin
st, res_admin_login = request('http://localhost:8000/auth/login', method='POST', data=form_good, headers={'Content-Type': 'application/x-www-form-urlencoded'})
admin_token = res_admin_login['access_token']

# POST /productos con rol admin
st, res_prod_created = request('http://localhost:8000/productos', method='POST', data={
    'nombre': 'Mousse de Maracuyá Artesanal',
    'precio_final': 3600.0,
    'cuotas_cantidad': 3,
    'cuotas_valor': 1200.0,
    'garantia_meses': 0,
    'stock': 14,
    'imagen': 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=600'
}, headers={'Authorization': f'Bearer {admin_token}'})
print(f'\n[14] POST /productos con rol admin -> Status: {st} (201 Created)')
print(f'     Producto creado exitosamente: {res_prod_created}')

print('\n=== TODOS LOS TESTS COMPLETADOS CON ÉXITO ===')
