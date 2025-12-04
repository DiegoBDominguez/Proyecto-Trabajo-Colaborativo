from django.db import models
from django.contrib.auth.models import AbstractUser

class CustomUser(AbstractUser):
    ROLES = (('admin','Admin'), ('agente','Agente'), ('usuario','Usuario'))
    rol = models.CharField(max_length=20, choices=ROLES, default='usuario')
    def __str__(self): return f"{self.username} ({self.rol})"

class Admin(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='perfil_admin')
    clave_admin = models.CharField(max_length=255, blank=True, null=True)
    telefono = models.CharField(max_length=20, blank=True, null=True)
    rfc = models.CharField(max_length=13, blank=True, null=True)
    edad = models.IntegerField(blank=True, null=True)
    ocupacion = models.CharField(max_length=255, blank=True, null=True)
    creation = models.DateTimeField(auto_now_add=True)
    update = models.DateTimeField(auto_now=True)
    def __str__(self): return f"Perfil Admin: {self.user.username}"

class Agente(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='perfil_agente')
    clave_agente = models.CharField(max_length=255, blank=True, null=True)
    telefono = models.CharField(max_length=20, blank=True, null=True)
    especialidad = models.CharField(max_length=255, blank=True, null=True)
    experiencia = models.IntegerField(blank=True, null=True)  # años
    creation = models.DateTimeField(auto_now_add=True)
    update = models.DateTimeField(auto_now=True)
    def __str__(self): return f"Perfil Agente: {self.user.username}"

class Usuario(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='perfil_usuario')
    clave_usuario = models.CharField(max_length=255, blank=True, null=True)
    telefono = models.CharField(max_length=20, blank=True, null=True)
    edad = models.IntegerField(blank=True, null=True)
    area = models.CharField(max_length=255, blank=True, null=True)
    # opcionales (si no los usarás, puedes quitarlos luego)
    direccion = models.CharField(max_length=255, blank=True, null=True)
    fecha_nacimiento = models.DateField(blank=True, null=True)
    creation = models.DateTimeField(auto_now_add=True)
    update = models.DateTimeField(auto_now=True)
    def __str__(self): return f"Perfil Usuario: {self.user.username}"

class Ticket(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='tickets')
    titulo = models.CharField(max_length=255, blank=True, null=True)
    descripcion = models.TextField()
    categoria = models.CharField(max_length=100)
    prioridad = models.CharField(max_length=50, default='Media')
    estado = models.CharField(max_length=50, default='Nuevo')
    responsable = models.CharField(max_length=150)
    archivo_name = models.CharField(max_length=255, blank=True, null=True)   # <- coincide con tu front (archivoName)
    archivo_dataurl = models.TextField(blank=True, null=True)                # <- coincide con tu front (archivoDataUrl)
    fecha = models.DateTimeField(auto_now_add=True)
    def __str__(self): return f"Ticket #{self.id} - {self.descripcion[:30]}"


class Mensaje(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='mensajes')
    usuario = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='mensajes')
    texto = models.TextField()
    es_agente = models.BooleanField(default=False)
    fecha = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        quien = 'Agente' if self.es_agente else 'Usuario'
        return f"Mensaje {self.id} ({quien}) - {self.texto[:30]}"


class Attachment(models.Model):
    """Archivo adjunto a un Mensaje de ticket."""
    mensaje = models.ForeignKey(Mensaje, on_delete=models.CASCADE, related_name='attachments')
    archivo = models.FileField(upload_to='mensajes/%Y/%m/%d/')
    nombre_original = models.CharField(max_length=255, blank=True, null=True)
    mime_type = models.CharField(max_length=100, blank=True, null=True)
    tamano = models.PositiveIntegerField(blank=True, null=True)
    creado = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Attachment {self.id} - {self.nombre_original or self.archivo.name}"


# ========== CHAT EN TIEMPO REAL ==========
class ConversacionChat(models.Model):
    # Permitir conversaciones entre cualquier par de usuarios (sin restricción de rol)
    usuario = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='conversaciones_chat_user')
    otro_usuario = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='conversaciones_chat_otro')
    ticket = models.ForeignKey(Ticket, on_delete=models.SET_NULL, null=True, blank=True, related_name='conversacion_chat')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    ultima_actividad = models.DateTimeField(auto_now=True)

    class Meta:
        # Evitar duplicados: {A,B} == {B,A}
        unique_together = (('usuario', 'otro_usuario'),)
        ordering = ['-ultima_actividad']

    def __str__(self):
        return f"Chat {self.usuario.username} - {self.otro_usuario.username}"


class MensajeChat(models.Model):
    conversacion = models.ForeignKey(ConversacionChat, on_delete=models.CASCADE, related_name='mensajes')
    remitente = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    texto = models.TextField()
    es_agente = models.BooleanField(default=False)
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['fecha']

    def __str__(self):
        quien = 'Agente' if self.es_agente else 'Usuario'
        return f"Mensaje Chat {self.id} ({quien}) - {self.texto[:30]}"


class Notification(models.Model):
    """Notificaciones persistentes enviadas a usuarios (backend-backed)."""
    NOTIFICATION_TYPES = (
        ('ticket_assigned', 'Ticket Asignado'),
        ('ticket_response', 'Respuesta en Ticket'),
        ('ticket_closed', 'Ticket Cerrado'),
        ('user_registered', 'Usuario Registrado'),
    )
    
    recipient = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='notifications_received')
    tipo = models.CharField(max_length=50, choices=NOTIFICATION_TYPES)
    titulo = models.CharField(max_length=255)
    mensaje = models.TextField()
    icono = models.CharField(max_length=50, blank=True, default='fa-bell')
    leida = models.BooleanField(default=False)
    
    # Datos adicionales (JSON para flexibilidad)
    ticket_id = models.IntegerField(null=True, blank=True)
    data_json = models.JSONField(default=dict, blank=True)
    
    creada = models.DateTimeField(auto_now_add=True)
    leida_en = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-creada']
    
    def __str__(self):
        return f"Notif #{self.id} para {self.recipient.username}: {self.titulo}"
