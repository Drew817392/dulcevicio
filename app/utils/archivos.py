"""
Utilidades para manejo y validación de seguridad de archivos subidos.
"""

def parece_imagen(contenido: bytes) -> bool:
    """
    Valida la firma real de bytes (magic numbers) del archivo.
    Soporta:
    - JPG / JPEG: inicia con b"\\xff\\xd8\\xff"
    - PNG: inicia con b"\\x89PNG\\r\\n\\x1a\\n"
    - WebP: inicia con b"RIFF" (y usualmente contiene "WEBP" en offset 8..12)
    """
    if not isinstance(contenido, (bytes, bytearray)):
        return False

    if len(contenido) < 12:
        return False

    # 1. JPEG / JPG (FF D8 FF)
    if contenido.startswith(b"\xff\xd8\xff"):
        return True

    # 2. PNG (\x89PNG\r\n\x1a\n)
    if contenido.startswith(b"\x89PNG\r\n\x1a\n"):
        return True

    # 3. WebP (RIFF + WEBP / inicia con RIFF)
    if contenido.startswith(b"RIFF"):
        return True

    return False
