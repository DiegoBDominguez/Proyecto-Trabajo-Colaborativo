"""
Script para crear usuarios de prueba en la base de datos.
Ejecutar: python manage.py shell < crear_usuarios_prueba.py

Crea:
- Usuario: Diego (usuario@example.com)
- Agente: Maria (agente@example.com)
- Admin: Carlos (admin@example.com)
"""

from cuentas.models import CustomUser, Usuario, Agente, Admin

# Usuario de prueba
usuario = CustomUser.objects.create_user(
    username='diego',
    email='usuario@example.com',
    password='123456',
    first_name='Diego',
    last_name='García',
    rol='usuario'
)
print(f"✓ Usuario creado: {usuario.email} (ID: {usuario.id})")

# Agente de prueba
agente_user = CustomUser.objects.create_user(
    username='maria',
    email='agente@example.com',
    password='123456',
    first_name='María',
    last_name='López',
    rol='agente'
)
agente = Agente.objects.create(user=agente_user)
print(f"✓ Agente creado: {agente_user.email} (ID: {agente_user.id})")

# Admin de prueba
admin_user = CustomUser.objects.create_user(
    username='carlos',
    email='admin@example.com',
    password='123456',
    first_name='Carlos',
    last_name='Rodríguez',
    rol='admin'
)
admin = Admin.objects.create(user=admin_user)
print(f"✓ Admin creado: {admin_user.email} (ID: {admin_user.id})")

print("\n✓ Usuarios de prueba creados exitosamente!")
print("\nCredenciales de prueba:")
print("  Usuario: usuario@example.com / 123456")
print("  Agente: agente@example.com / 123456")
print("  Admin: admin@example.com / 123456")
