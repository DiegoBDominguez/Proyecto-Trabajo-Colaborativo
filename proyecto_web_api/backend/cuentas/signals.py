from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import CustomUser, Admin, Agente, Usuario

@receiver(post_save, sender=CustomUser)
def crear_perfil_por_rol(sender, instance, created, **kwargs):
    if not created:
        return
    if instance.rol == 'admin':
        Admin.objects.create(user=instance)
    elif instance.rol == 'agente':
        Agente.objects.create(user=instance)
    else:
        Usuario.objects.create(user=instance)
