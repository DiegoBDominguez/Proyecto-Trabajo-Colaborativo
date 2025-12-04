# Guía de Despliegue en PythonAnywhere

## 1. Preparación en PythonAnywhere

### 1.1 Crear cuenta y proyecto
- Ir a https://www.pythonanywhere.com
- Crear una cuenta gratuita o premium
- En el panel, ir a **Web** → **Add a new web app**

### 1.2 Seleccionar Python y Framework
- Elegir Python 3.10+ (recomendado 3.11)
- Seleccionar **Django** como framework
- Permitir que PythonAnywhere cree la estructura inicial

## 2. Clonar/Subir el Proyecto

### Opción A: Clonar desde Git
```bash
cd /home/tu_usuario
git clone https://github.com/DiegoBDominguez/Proyecto-Trabajo-Colaborativo.git
cd Proyecto-Trabajo-Colaborativo/proyecto_trab_v3/proyecto_web_api/backend
```

### Opción B: Subir archivos
- Usar el administrador de archivos de PythonAnywhere
- Subir la carpeta `backend/` completa

## 3. Instalar Dependencias

En la **Consola Bash** de PythonAnywhere:

```bash
# Navegar a la carpeta del proyecto
cd /home/tu_usuario/Proyecto-Trabajo-Colaborativo/proyecto_trab_v3/proyecto_web_api/backend

# Activar virtualenv (PythonAnywhere lo crea automáticamente)
source /home/tu_usuario/.virtualenvs/tu_proyecto/bin/activate

# Instalar requirements
pip install -r requirements.txt
```

## 4. Configurar Variables de Entorno

En **Web** → **WSGI configuration file**, o crear `.env`:

```bash
# En la consola:
cat > /home/tu_usuario/Proyecto-Trabajo-Colaborativo/proyecto_trab_v3/proyecto_web_api/backend/.env << EOF
DEBUG=False
SECRET_KEY=tu-clave-secreta-segura-aqui
ALLOWED_HOSTS=tu_usuario.pythonanywhere.com,127.0.0.1,localhost
DB_ENGINE=django.db.backends.mysql
DB_NAME=tu_usuario\$nombre_bd
DB_USER=tu_usuario
DB_PASSWORD=tu_contraseña_bd
DB_HOST=tu_usuario.mysql.pythonanywhere-services.com
DB_PORT=3306
CHANNEL_LAYERS=InMemoryChannelLayer
EOF
```

## 5. Actualizar settings.py

Editar `/home/tu_usuario/Proyecto-Trabajo-Colaborativo/proyecto_trab_v3/proyecto_web_api/backend/backend/settings.py`:

```python
# Agregar al inicio:
from dotenv import load_dotenv
import os
load_dotenv()

# Cambiar DEBUG y SECRET_KEY:
DEBUG = os.getenv('DEBUG', 'False') == 'True'
SECRET_KEY = os.getenv('SECRET_KEY', 'cambiar-en-produccion')

# Cambiar ALLOWED_HOSTS:
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost').split(',')

# Cambiar DATABASE (usar MySQL de PythonAnywhere):
DATABASES = {
    'default': {
        'ENGINE': os.getenv('DB_ENGINE', 'django.db.backends.sqlite3'),
        'NAME': os.getenv('DB_NAME', 'db.sqlite3'),
        'USER': os.getenv('DB_USER', ''),
        'PASSWORD': os.getenv('DB_PASSWORD', ''),
        'HOST': os.getenv('DB_HOST', ''),
        'PORT': os.getenv('DB_PORT', '3306'),
    }
}

# CORS para frontend en PythonAnywhere:
CORS_ALLOWED_ORIGINS = [
    'https://tu_usuario.pythonanywhere.com',
    'http://localhost:4200',  # desarrollo local
]
```

## 6. Migraciones de Base de Datos

En la **Consola Bash**:

```bash
# Navegar al proyecto
cd /home/tu_usuario/Proyecto-Trabajo-Colaborativo/proyecto_trab_v3/proyecto_web_api/backend

# Activar virtualenv
source /home/tu_usuario/.virtualenvs/tu_proyecto/bin/activate

# Ejecutar migraciones
python manage.py migrate

# Crear superusuario (admin)
python manage.py createsuperuser
```

## 7. Recolectar Archivos Estáticos

```bash
# En la misma consola:
python manage.py collectstatic --noinput
```

## 8. Configurar WSGI en PythonAnywhere

En **Web** → **WSGI configuration file**, reemplazar el contenido por:

```python
import os
import sys
from pathlib import Path

# Agregar el proyecto al path
path = '/home/tu_usuario/Proyecto-Trabajo-Colaborativo/proyecto_trab_v3/proyecto_web_api/backend'
if path not in sys.path:
    sys.path.insert(0, path)

# Configurar Django
os.environ['DJANGO_SETTINGS_MODULE'] = 'backend.settings'

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
```

## 9. Configurar Web App en PythonAnywhere

En **Web**:
- **Source code**: `/home/tu_usuario/Proyecto-Trabajo-Colaborativo/proyecto_trab_v3/proyecto_web_api/backend`
- **Working directory**: `/home/tu_usuario/Proyecto-Trabajo-Colaborativo/proyecto_trab_v3/proyecto_web_api/backend`
- **Python version**: 3.11
- **Virtualenv path**: `/home/tu_usuario/.virtualenvs/tu_proyecto`
- **WSGI configuration file**: (ya configurado arriba)

## 10. Reiniciar la Web App

En **Web**, click en **Reload** para aplicar cambios.

## 11. Probar la API

```
https://tu_usuario.pythonanywhere.com/api/cuentas/
```

Debería devolver un JSON con los endpoints disponibles.

## 12. Desplegar Frontend (Opcional)

Si quieres servir Angular desde PythonAnywhere:

```bash
# En tu máquina local:
cd proyecto-webapp
ng build --configuration production

# Copiar dist/proyecto-webapp a PythonAnywhere
# Actualizar settings.py para servir static files
```

O usa un CDN (Firebase Hosting, Vercel, Netlify, etc.)

---

## Troubleshooting

### Error: "ModuleNotFoundError: No module named 'channels'"
```bash
# Reinstalar channels
pip install channels channels-redis daphne --force-reinstall
```

### Error: "CSRF token missing"
Agregar a settings.py:
```python
CSRF_TRUSTED_ORIGINS = [
    'https://tu_usuario.pythonanywhere.com',
]
```

### WebSocket no funciona
En PythonAnywhere, WebSocket en plan gratuito es limitado. Para producción:
- Usar Heroku + Redis Add-on
- O cambiar CHANNEL_LAYERS a InMemoryChannelLayer (desarrollo)
- O usar un servicio separado para WebSocket

### Base de datos lenta
- Usar MySQL de PythonAnywhere (más rápido que SQLite)
- Agregar índices en modelos frecuentemente consultados
- Usar `select_related()` y `prefetch_related()` en querysets

---

## Checklist Final

- [ ] Requierements.txt instalados
- [ ] .env configurado con secretos seguros
- [ ] Migraciones ejecutadas
- [ ] Superusuario creado
- [ ] Static files recolectados
- [ ] WSGI configuration actualizado
- [ ] ALLOWED_HOSTS incluye dominio de PythonAnywhere
- [ ] CORS_ALLOWED_ORIGINS configurado
- [ ] Web app reiniciada
- [ ] API accesible desde navegador
- [ ] Login funciona
- [ ] Tickets se pueden crear
- [ ] Notificaciones se generan
