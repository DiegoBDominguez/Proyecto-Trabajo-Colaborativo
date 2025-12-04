# cuentas/serializers.py
from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from datetime import datetime

from .models import CustomUser, Admin, Agente, Usuario, Ticket, Mensaje, ConversacionChat, MensajeChat, Notification


# --- Serializers básicos ---
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'rol')


class AdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Admin
        fields = '__all__'


class AgenteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Agente
        fields = '__all__'


class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = '__all__'


class AttachmentSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = getattr(__import__('cuentas.models', fromlist=['Attachment']), 'Attachment')
        fields = ('id', 'nombre_original', 'mime_type', 'tamano', 'url')

    def get_url(self, obj):
        request = self.context.get('request')
        if obj.archivo and hasattr(obj.archivo, 'url'):
            try:
                return request.build_absolute_uri(obj.archivo.url) if request else obj.archivo.url
            except Exception:
                return getattr(obj.archivo, 'url', None)
        return None


class TicketSerializer(serializers.ModelSerializer):
    archivoName = serializers.CharField(source='archivo_name', required=False, allow_null=True, allow_blank=True)
    archivoDataUrl = serializers.CharField(source='archivo_dataurl', required=False, allow_null=True, allow_blank=True)

    # Folios (solo lectura)
    folio = serializers.SerializerMethodField()                 # código global bonito
    folio_usuario = serializers.IntegerField(read_only=True, required=False)  # viene de annotate en la vista
    folio_agente = serializers.IntegerField(read_only=True, required=False)   # viene de annotate en la vista
    
    # Datos del usuario que creó el ticket
    usuario_email = serializers.SerializerMethodField()
    usuario_nombre = serializers.SerializerMethodField()
    usuario_id = serializers.IntegerField(source='user.id', read_only=True)
    
    # ID del agente asignado (para notificaciones dirigidas)
    agente_id = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = [
            'id', 'titulo', 'descripcion', 'categoria', 'prioridad', 'estado',
            'responsable', 'fecha', 'archivoName', 'archivoDataUrl',
            'folio', 'folio_usuario', 'folio_agente', 'usuario_email', 'usuario_nombre', 'usuario_id', 'agente_id'
        ]
        read_only_fields = ['id', 'fecha', 'folio', 'folio_usuario', 'folio_agente', 'usuario_email', 'usuario_nombre', 'agente_id']

    def get_folio(self, obj):
        """
        Crea un código global tipo: TCK-2025-000015 (año de la fecha o actual + id con padding).
        """
        try:
            year = getattr(obj.fecha, 'year', None) or datetime.utcnow().year
        except Exception:
            year = datetime.utcnow().year
        try:
            num = int(obj.id)
        except Exception:
            num = 0
        return f"TCK-{year}-{num:06d}"

    def get_usuario_email(self, obj):
        """Devuelve el email del usuario que creó el ticket"""
        try:
            # El modelo Ticket define la FK como 'user'
            user = getattr(obj, 'user', None)
            if user:
                return getattr(user, 'email', None)
        except Exception:
            pass
        return None

    def get_usuario_nombre(self, obj):
        """Devuelve el nombre completo del usuario que creó el ticket"""
        try:
            # El modelo Ticket define la FK como 'user'
            user = getattr(obj, 'user', None)
            if user:
                nombre = f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip()
                return nombre if nombre else getattr(user, 'username', None)
        except Exception:
            pass
        return None

    def get_agente_id(self, obj):
        """Devuelve el ID del usuario agente responsable del ticket."""
        try:
            from .models import CustomUser
            responsable_username = getattr(obj, 'responsable', None)
            if responsable_username:
                agente_user = CustomUser.objects.filter(username__iexact=responsable_username).first()
                if agente_user:
                    return agente_user.id
        except Exception:
            pass
        return None


# --- Serializers de Registro Completo ---
class _BaseFullRegisterSerializer(serializers.Serializer):
    """Base para Admin, Agente y Usuario"""

    username = serializers.CharField()
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    first_name = serializers.CharField()
    last_name = serializers.CharField()

    def create_user(self, validated_data, rol):
        """Crea el usuario evitando duplicados por email"""
        if CustomUser.objects.filter(email=validated_data["email"]).exists():
            raise serializers.ValidationError("Ya existe un usuario con este correo")

        user, created = CustomUser.objects.get_or_create(
            username=validated_data["username"],
            defaults={
                "email": validated_data["email"],
                "first_name": validated_data.get("first_name", ""),
                "last_name": validated_data.get("last_name", ""),
                "rol": rol,
                "password": make_password(validated_data["password"]),
            }
        )
        return user


class AdminFullRegisterSerializer(_BaseFullRegisterSerializer):
    telefono = serializers.CharField(required=False, allow_blank=True)
    rfc = serializers.CharField(required=False, allow_blank=True)
    edad = serializers.IntegerField(required=False)
    ocupacion = serializers.CharField(required=False, allow_blank=True)

    def create(self, validated_data):
        user = self.create_user(validated_data, rol="admin")
        admin, created = Admin.objects.update_or_create(
            user=user,
            defaults={
                "telefono": validated_data.get("telefono"),
                "rfc": validated_data.get("rfc"),
                "edad": validated_data.get("edad"),
                "ocupacion": validated_data.get("ocupacion"),
            }
        )
        return admin


class AgenteFullRegisterSerializer(_BaseFullRegisterSerializer):
    telefono = serializers.CharField(required=False, allow_blank=True)
    especialidad = serializers.CharField(required=False, allow_blank=True)
    experiencia = serializers.CharField(required=False, allow_blank=True)

    def create(self, validated_data):
        user = self.create_user(validated_data, rol="agente")
        agente, created = Agente.objects.update_or_create(
            user=user,
            defaults={
                "telefono": validated_data.get("telefono"),
                "especialidad": validated_data.get("especialidad"),
                "experiencia": validated_data.get("experiencia"),
            }
        )
        return agente


class UsuarioFullRegisterSerializer(_BaseFullRegisterSerializer):
    telefono = serializers.CharField(required=False, allow_blank=True)
    # direccion = serializers.CharField(required=False, allow_blank=True)
    # fecha_nacimiento = serializers.DateField(required=False)
    edad = serializers.IntegerField(required=True)
    area = serializers.CharField(required=True, allow_blank=True)

    def create(self, validated_data):
        user = self.create_user(validated_data, rol="usuario")
        usuario, created = Usuario.objects.update_or_create(
            user=user,
            defaults={
                "telefono": validated_data.get("telefono"),
                # "direccion": validated_data.get("direccion"),
                # "fecha_nacimiento": validated_data.get("fecha_nacimiento"),
                "edad": validated_data.get("edad"),
                "area": validated_data.get("area"),
            }
        )
        return usuario


# ========== CHAT EN TIEMPO REAL ==========
class MensajeChatSerializer(serializers.ModelSerializer):
    remitente = serializers.CharField(source='remitente.username', read_only=True)
    
    class Meta:
        model = MensajeChat
        fields = ('id', 'conversacion', 'remitente', 'texto', 'es_agente', 'fecha')
        read_only_fields = ('id', 'fecha', 'remitente', 'es_agente')


class MensajeSerializer(serializers.ModelSerializer):
    """Serializer para mensajes de tickets (modelo Mensaje)"""
    usuario = serializers.CharField(source='usuario.username', read_only=True)
    usuarioFullName = serializers.CharField(source='usuario.get_full_name', read_only=True)
    attachments = serializers.SerializerMethodField()

    def get_attachments(self, obj):
        from .serializers import AttachmentSerializer
        attachments = getattr(obj, 'attachments', None)
        if attachments is None:
            # related name is 'attachments'
            attachments = obj.attachments.all() if hasattr(obj, 'attachments') else []
        serializer = AttachmentSerializer(attachments, many=True, context=self.context)
        return serializer.data
    
    class Meta:
        model = Mensaje
        fields = ('id', 'ticket', 'usuario', 'usuarioFullName', 'texto', 'es_agente', 'fecha', 'attachments')
        read_only_fields = ('id', 'ticket', 'usuario', 'usuarioFullName', 'fecha', 'es_agente')


class ConversacionChatSerializer(serializers.ModelSerializer):
    agenteName = serializers.CharField(source='agente.get_full_name', read_only=True)
    agentEmail = serializers.CharField(source='agente.email', read_only=True)
    ultimoMensaje = serializers.SerializerMethodField()
    ultimaActividad = serializers.DateTimeField(source='ultima_actividad', read_only=True)
    usuarioId = serializers.IntegerField(source='usuario.id', read_only=True)
    agenteId = serializers.IntegerField(source='agente.id', read_only=True)
    usuarioName = serializers.CharField(source='usuario.get_full_name', read_only=True)
    usuarioEmail = serializers.CharField(source='usuario.email', read_only=True)
    ticketId = serializers.IntegerField(source='ticket.id', read_only=True, required=False, allow_null=True)
    ticketAsunto = serializers.CharField(source='ticket.titulo', read_only=True, required=False, allow_null=True)

    class Meta:
        model = ConversacionChat
        fields = ('id', 'usuarioId', 'usuarioName', 'usuarioEmail', 'agenteId', 'agenteName', 'agentEmail', 'ticketId', 'ticketAsunto', 'ultimoMensaje', 'ultimaActividad')
        read_only_fields = ('id', 'ultimoMensaje', 'ultimaActividad')

    def get_ultimoMensaje(self, obj):
        ultimo = obj.mensajes.last()
        return ultimo.texto if ultimo else ''


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer para notificaciones persistentes."""
    recipientId = serializers.IntegerField(source='recipient.id', read_only=True)
    
    class Meta:
        model = Notification
        fields = ('id', 'recipientId', 'tipo', 'titulo', 'mensaje', 'icono', 'leida', 'ticket_id', 'data_json', 'creada', 'leida_en')
        read_only_fields = ('id', 'recipientId', 'creada', 'leida_en')

