from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime

class UsuarioBase(BaseModel):
    nombre: str
    email: EmailStr

class UsuarioCreate(UsuarioBase):
    password: str
    acepto_tratamiento: bool

    @field_validator('acepto_tratamiento')
    @classmethod
    def check_consentimiento(cls, v: bool) -> bool:
        if not v:
            raise ValueError("Debe aceptar el tratamiento de datos personales conforme a la Ley 25.326 para registrarse.")
        return v

class UsuarioOut(UsuarioBase):
    id: int
    rol: str
    fecha_consentimiento: Optional[datetime] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    sub: Optional[str] = None
    rol: Optional[str] = None
    tipo: Optional[str] = None

class TokenRefresh(BaseModel):
    refresh_token: str
