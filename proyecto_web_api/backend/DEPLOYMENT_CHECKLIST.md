# 📦 CHECKLIST: Archivos para Despliegue en PythonAnywhere

## ✅ Archivos Listos para Subir

### 1. **requirements.txt** ← ARCHIVO PRINCIPAL
   - ✅ Contiene todas las dependencias necesarias
   - ✅ Versiones específicas para compatibilidad
   - Ubicación: `proyecto_web_api/backend/requirements.txt`
   - **Acción**: Subir tal cual a PythonAnywhere

### 2. Documentación de Ayuda
   - `DEPLOY_PYTHONANYWHERE.md` → Guía paso a paso
   - `README_DEPLOY.md` → Resumen rápido
   - `.env.example` → Template de variables

---

## 🚀 CHECKLIST DE INSTALACIÓN EN PYTHONANYWHERE

```bash
# 1. Clonar/Subir proyecto
cd /home/tu_usuario
git clone https://github.com/DiegoBDominguez/Proyecto-Trabajo-Colaborativo.git

# 2. Navegar a backend
cd Proyecto-Trabajo-Colaborativo/proyecto_trab_v3/proyecto_web_api/backend

# 3. Activar virtualenv (PythonAnywhere lo crea)
source /home/tu_usuario/.virtualenvs/tu_proyecto/bin/activate

# 4. ⭐ INSTALAR REQUIREMENTS (EL PASO CLAVE)
pip install -r requirements.txt

# 5. Copiar .env.example → .env y editar con tus datos
cp .env.example .env
nano .env  # Llenar DB_NAME, DB_USER, DB_PASSWORD, etc

# 6. Migraciones
python manage.py migrate

# 7. Crear admin
python manage.py createsuperuser

# 8. Recolectar statics
python manage.py collectstatic --noinput

# 9. Actualizar WSGI en PythonAnywhere (copiar código de DEPLOY_PYTHONANYWHERE.md)

# 10. Reload en Web
# (click en botón Reload en dashboard de PythonAnywhere)
```

---

## 📋 QUÉ CONTIENE requirements.txt

```
✅ Django 5.0.2
✅ Django REST Framework 3.14.0
✅ djangorestframework-simplejwt 5.3.2 (JWT)
✅ django-cors-headers 4.3.1
✅ django-filter 23.5
✅ channels 4.1.0 (WebSocket)
✅ daphne 4.0.0 (ASGI server)
✅ channels-redis 4.0.0 (channel layer)
✅ PyMySQL 1.1.0 (MySQL driver)
✅ cryptography 46.0.3
✅ gunicorn 21.2.0 (production server)
✅ whitenoise 6.6.0 (static files)
✅ python-dotenv 1.0.0 (env variables)
... y más (total 25+ paquetes)
```

---

## 🎯 ERRORES COMUNES Y SOLUCIONES

| Error | Solución |
|-------|----------|
| `ModuleNotFoundError: No module named 'channels'` | Reinstalar: `pip install channels --force-reinstall` |
| `Error: 500 Internal Server Error` | Ver logs: PythonAnywhere → Web → Log files |
| `CORS error en notificaciones` | Agregar dominio a `CORS_ALLOWED_ORIGINS` |
| `Connection refused en MySQL` | Verificar credenciales en `.env` y que MySQL esté activo |
| `WebSocket no conecta` | Normal en plan gratuito. HTTP polling ya está configurado |

---

## 🔐 SEGURIDAD

⚠️ **IMPORTANTE:**
- NO subir `.env` a GitHub (ya está en .gitignore)
- Cambiar `SECRET_KEY` en `.env` a un valor único
- Usar contraseñas seguras para BD
- En producción: `DEBUG=False`
- HTTPS: Activar en PythonAnywhere (automático con tu_usuario.pythonanywhere.com)

---

## ✅ VERIFICACIÓN FINAL

Después de desplegar, verificar que funciona:

```bash
# 1. API está disponible
curl https://tu_usuario.pythonanywhere.com/api/cuentas/

# 2. Login funciona
curl -X POST https://tu_usuario.pythonanywhere.com/api/cuentas/login/ \
  -d "username=admin&password=tu_password"

# 3. Tickets se pueden crear
curl -X POST https://tu_usuario.pythonanywhere.com/api/cuentas/tickets/ \
  -H "Authorization: Bearer <token>"

# 4. Admin panel funciona
# Ir a: https://tu_usuario.pythonanywhere.com/admin/
```

---

## 📚 DOCUMENTACIÓN COMPLETA

Para instrucciones detalladas, ver:
- **`DEPLOY_PYTHONANYWHERE.md`** (guía paso a paso)
- **`README_DEPLOY.md`** (resumen ejecutivo)

---

## 🆘 SOPORTE

Si hay problemas:
1. Revisar logs en PythonAnywhere Web → Log files
2. Activar `DEBUG=True` temporalmente en `.env` (solo para debugging)
3. Revisar console.log del navegador (frontend errors)
4. Revisar Django traceback en /api/admin/

---

**🎉 ¡Listo para desplegar!**

Sube `requirements.txt` junto con el resto del código y sigue los pasos en la guía.

