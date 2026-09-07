from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.core.security import hash_password, verificar_password, crear_token
from app.dependencies import get_current_user
from app.models.usuario import Usuario
from app.schemas.usuario import UsuarioCreate, UsuarioOut, Token, TokenRefresh

router = APIRouter(prefix="/auth", tags=["Autenticación"])

@router.post("/register", response_model=UsuarioOut, status_code=status.HTTP_201_CREATED)
def register(usuario_in: UsuarioCreate, db: Session = Depends(get_db)):
    # Verificar si el usuario ya existe
    db_user = db.query(Usuario).filter(Usuario.email == usuario_in.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya se encuentra registrado."
        )

    # Crear nuevo usuario con contraseña hasheada y consentimiento de Ley 25.326
    nuevo_usuario = Usuario(
        nombre=usuario_in.nombre,
        email=usuario_in.email,
        hashed_password=hash_password(usuario_in.password),
        rol="customer",
        acepto_tratamiento=usuario_in.acepto_tratamiento,
        fecha_consentimiento=datetime.now(timezone.utc)
    )
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)
    return nuevo_usuario

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Buscar usuario por email (enviado en form_data.username)
    user = db.query(Usuario).filter(Usuario.email == form_data.username).first()
    
    # Validación segura: mensaje genérico para no revelar si falló el email o la contraseña
    if not user or not verificar_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Generar access y refresh tokens
    access_token = crear_token(
        data={"sub": user.email, "rol": user.rol, "tipo": "access"},
        expires_delta=timedelta(minutes=settings.ACCESS_MIN)
    )
    refresh_token = crear_token(
        data={"sub": user.email, "rol": user.rol, "tipo": "refresh"},
        expires_delta=timedelta(minutes=settings.REFRESH_MIN)
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.get("/me", response_model=UsuarioOut)
def get_me(current_user: Usuario = Depends(get_current_user)):
    return current_user

@router.post("/refresh", response_model=Token)
def refresh_token(token_data: TokenRefresh, db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido o expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token_data.refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        tipo: str = payload.get("tipo")
        
        # Validación estricta del tipo de token
        if email is None or tipo != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido: se requiere un refresh token",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except JWTError:
        raise credentials_exception

    user = db.query(Usuario).filter(Usuario.email == email).first()
    if not user:
        raise credentials_exception

    # Generar nuevo access token
    new_access_token = crear_token(
        data={"sub": user.email, "rol": user.rol, "tipo": "access"},
        expires_delta=timedelta(minutes=settings.ACCESS_MIN)
    )
    new_refresh_token = crear_token(
        data={"sub": user.email, "rol": user.rol, "tipo": "refresh"},
        expires_delta=timedelta(minutes=settings.REFRESH_MIN)
    )

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }
