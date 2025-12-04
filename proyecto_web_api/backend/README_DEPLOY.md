# 🚀 Despliegue en PythonAnywhere - Guía Rápida

## Resumen

Tu proyecto está listo para desplegar en **PythonAnywhere**. Sigue estos pasos:

## 📋 Pre-requisitos

- [ ] Cuenta en PythonAnywhere (gratuita o premium)
- [ ] Git instalado (o acceso a subir archivos)
- [ ] MySQL database en PythonAnywhere

## ⚡ Pasos Rápidos

### 1. Clonar el proyecto
```bash
cd /home/tu_usuario
git clone https://github.com/DiegoBDominguez/Proyecto-Trabajo-Colaborativo.git
cd Proyecto-Trabajo-Colaborativo/proyecto_trab_v3/proyecto_web_api/backend
```

### 2. Instalar dependencias
```bash
# Activar venv de PythonAnywhere
source /home/tu_usuario/.virtualenvs/tu_proyecto/bin/activate

# Instalar
pip install -r requirements.txt
```

### 3. Configurar variables
```bash
# Copiar template de .env
cp .env.example .env

# Editar .env con tus datos de MySQL
nano .env
```

### 4. Migraciones
```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py collectstatic --noinput
```

### 5. Configurar WSGI
En PythonAnywhere → Web → WSGI configuration:
```python
import os, sys
path = '/home/tu_usuario/Proyecto-Trabajo-Colaborativo/proyecto_trab_v3/proyecto_web_api/backend'
sys.path.insert(0, path)
os.environ['DJANGO_SETTINGS_MODULE'] = 'backend.settings'
from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
```

### 6. Reload
Click en **Reload** en la web app

---

## 📦 Dependencias Incluidas

✅ **Django** - Framework web  
✅ **Django REST Framework** - API REST  
✅ **JWT Authentication** - Autenticación segura  
✅ **Channels + Daphne** - WebSocket en tiempo real  
✅ **MySQL** - Base de datos  
✅ **CORS Headers** - Acceso desde otros dominios  
✅ **Gunicorn** - Servidor de producción  

---

## 🔗 URLs Importantes

| URL | Descripción |
|-----|-------------|
| `https://tu_usuario.pythonanywhere.com/api/cuentas/` | API principal |
| `https://tu_usuario.pythonanywhere.com/admin/` | Admin panel |
| `https://tu_usuario.pythonanywhere.com/api/cuentas/tickets/` | Tickets |
| `https://tu_usuario.pythonanywhere.com/api/cuentas/notifications/` | Notificaciones |

---

## 🆘 Troubleshooting

**Error 500 en notificaciones:**
→ Revisar logs en PythonAnywhere Web → Log files

**CORS error:**
→ Agregar dominio a `CORS_ALLOWED_ORIGINS` en settings.py

**WebSocket no funciona:**
→ Normal en plan gratuito. Usar polling HTTP (ya configurado)

---

## 📚 Documentación Completa

Ver `DEPLOY_PYTHONANYWHERE.md` para guía detallada paso a paso.

---

## 🎯 Próximos pasos

1. ✅ Backend deployado en PythonAnywhere
2. ⬜ Frontend deployado (Firebase Hosting, Netlify, Vercel, etc.)
3. ⬜ Apuntar dominio personalizado
4. ⬜ Configurar SSL/HTTPS
5. ⬜ Monitoreo y logs

¡Listo! 🎉
