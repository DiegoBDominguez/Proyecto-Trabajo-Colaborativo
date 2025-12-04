from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.viewsets import ModelViewSet
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action
from django.db.models import Q, F, Window
from django.db.models.functions import RowNumber

from rest_framework_simplejwt.tokens import RefreshToken
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
import logging

logger = logging.getLogger(__name__)

from .models import CustomUser, Admin, Agente, Usuario, Ticket, ConversacionChat, MensajeChat, Mensaje, Attachment, Notification
from .serializers import (
    UserSerializer, AdminSerializer, AgenteSerializer, UsuarioSerializer,
    AdminFullRegisterSerializer, AgenteFullRegisterSerializer, UsuarioFullRegisterSerializer, TicketSerializer,
    ConversacionChatSerializer, MensajeChatSerializer, NotificationSerializer
)

from django.db.models import Count, Q
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.utils import timezone
from django.db.models.functions import TruncDate
from django.db.models import Avg


# -------------------------
# FUNCIONES HELPER PARA NOTIFICACIONES
# -------------------------
def send_ws_notification(recipient_user_id: int, titulo: str, ticket_id: int):
    """
    Intenta enviar una notificación por WebSocket al usuario.
    Si Redis no está disponible o hay error, solo loguea.
    """
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'notifications_{recipient_user_id}',
            {
                'type': 'notification_message',
                'id': 'new_notification',
                'titulo': titulo,
                'ticket_id': ticket_id
            }
        )
        logger.info(f'[Notificaciones] WebSocket enviado a usuario {recipient_user_id}')
    except Exception as e:
        logger.warning(f'[Notificaciones] Error enviando WebSocket a usuario {recipient_user_id}: {str(e)}')
        # No fallar - las notificaciones en BD ya están guardadas


# -------------------------
# VIEWS BASADAS EN VIEWSET
# -------------------------
class UserViewSet(ModelViewSet):
    queryset = CustomUser.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]


class AdminViewSet(ModelViewSet):
    queryset = Admin.objects.all()
    serializer_class = AdminSerializer
    permission_classes = [IsAuthenticated]


class AgenteViewSet(ModelViewSet):
    queryset = Agente.objects.all()
    serializer_class = AgenteSerializer
    permission_classes = [IsAuthenticated]


class UsuarioViewSet(ModelViewSet):
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer
    permission_classes = [IsAuthenticated]


class TicketViewSet(ModelViewSet):
    serializer_class = TicketSerializer
    permission_classes = [IsAuthenticated]
    # queryset base para que DRF registre correctamente las rutas
    queryset = Ticket.objects.all()

    def get_queryset(self):
        """
        - usuario: solo sus tickets, con folio_usuario (1..n por usuario)
        - agente: tickets donde 'responsable' == username del agente (case-insensitive), con folio_agente (1..n por agente)
        - admin  : ve todo
        """
        user = self.request.user
        rol = getattr(user, 'rol', None)

        if rol == 'usuario':
            qs = (Ticket.objects
                  .filter(user=user)
                  .order_by('fecha')  # asc para que 1 sea el primero creado por el usuario
                  .annotate(
                      folio_usuario=Window(
                          expression=RowNumber(),
                          partition_by=[F('user')],
                          order_by=F('fecha').asc()
                      )
                  ))
            return qs

        if rol == 'agente':
            # Asumiendo que hoy se guarda 'responsable' como username (CharField)
            qs = (Ticket.objects
                  .filter(responsable__iexact=user.username)
                  .order_by('fecha')
                  .annotate(
                      folio_agente=Window(
                          expression=RowNumber(),
                          partition_by=[F('responsable')],
                          order_by=F('fecha').asc()
                      )
                  ))
            return qs

        # admin (u otros): ve todo
        return Ticket.objects.all().order_by('-fecha')

    def perform_create(self, serializer):
        """
        Al crear un ticket: asignar automáticamente a un agente.
        Dado que `responsable` en la BD es CharField, siempre guardamos el
        username del agente seleccionado (string). Seleccionamos el agente
        con menos tickets (conteo por campo responsable como string).
        Luego crea una notificación persistente al agente asignado.
        """
        user = self.request.user

        # buscar agentes y elegir el que tenga menos tickets (por username)
        agentes = Agente.objects.all()
        selected_agent = None
        if agentes.exists():
            min_agent = None
            min_count = None
            for ag in agentes:
                c = Ticket.objects.filter(responsable__iexact=ag.user.username).count()
                if min_count is None or c < min_count:
                    min_count = c
                    min_agent = ag
            selected_agent = min_agent

        responsable_value = selected_agent.user.username if selected_agent else user.username
        ticket = serializer.save(user=user, responsable=responsable_value)

        # Crear notificación persistente para el agente asignado
        if selected_agent:
            try:
                titulo_ticket = getattr(ticket, 'titulo', 'Sin título') or 'Sin título'
                Notification.objects.create(
                    recipient=selected_agent.user,
                    tipo='ticket_assigned',
                    titulo='Nuevo Ticket Asignado',
                    mensaje=f'Se te ha asignado un nuevo ticket: "{titulo_ticket}"',
                    ticket_id=ticket.id
                )
                logger.info(f'[Notificaciones] Notificación de asignación creada en BD para agente {selected_agent.user.id}')
                # Intentar enviar por WebSocket
                send_ws_notification(selected_agent.user.id, 'Nuevo Ticket Asignado', ticket.id)
            except Exception as e:
                logger.error(f'[Notificaciones] Error al crear notificación de asignación: {str(e)}')

    @action(detail=False, methods=['get'])
    def sugerir_agente(self, request):
        """
        Devuelve el agente que sería asignado al crear un ticket según la
        misma lógica de `perform_create` (agente con menos tickets).
        """
        agentes = Agente.objects.all()
        selected_agent = None
        if agentes.exists():
            min_agent = None
            min_count = None
            for ag in agentes:
                c = Ticket.objects.filter(responsable__iexact=ag.user.username).count()
                if min_count is None or c < min_count:
                    min_count = c
                    min_agent = ag
            selected_agent = min_agent

        if not selected_agent:
            return Response({'username': None, 'full_name': None}, status=status.HTTP_200_OK)

        user = selected_agent.user
        full_name = f"{user.first_name} {user.last_name}".strip() or user.username
        return Response({'username': user.username, 'full_name': full_name}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def assigned(self, request):
        """
        Devuelve los tickets asignados al agente autenticado.
        Filtra por `responsable` comparando con el username (case-insensitive).
        """
        user = request.user
        if not Agente.objects.filter(user=user).exists():
            return Response([], status=status.HTTP_200_OK)

        qs = Ticket.objects.filter(responsable__iexact=user.username).order_by('-fecha')
        serializer = TicketSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def mensajes(self, request, pk=None):
        """Obtiene los mensajes/respuestas de un ticket"""
        ticket = self.get_object()

        # Verificar acceso: el usuario es propietario del ticket O el agente responsable
        user = request.user
        is_owner = ticket.user == user
        is_responsible = (
            getattr(user, 'rol', None) == 'agente' and
            ticket.responsable.lower() == user.username.lower()
        )
        if not (is_owner or is_responsible):
            return Response(
                {"error": "No tienes permiso para ver este ticket"},
                status=status.HTTP_403_FORBIDDEN
            )

        from .serializers import MensajeSerializer
        mensajes = ticket.mensajes.all().order_by('fecha')
        serializer = MensajeSerializer(mensajes, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def responder(self, request, pk=None):
        """Envía una respuesta a un ticket con validación de archivos."""
        from django.utils import timezone
        
        ticket = self.get_object()

        # Verificar acceso: el usuario es propietario del ticket O el agente responsable
        user = request.user
        is_owner = ticket.user == user
        is_responsible = (
            getattr(user, 'rol', None) == 'agente' and
            ticket.responsable.lower() == user.username.lower()
        )
        if not (is_owner or is_responsible):
            return Response(
                {"error": "No tienes permiso"},
                status=status.HTTP_403_FORBIDDEN
            )

        texto = request.data.get('texto')
        if not texto or not texto.strip():
            return Response(
                {"error": "El mensaje no puede estar vacío"},
                status=status.HTTP_400_BAD_REQUEST
            )

        es_agente = getattr(user, 'rol', None) == 'agente'
        mensaje = Mensaje.objects.create(
            ticket=ticket,
            usuario=user,
            texto=texto.strip(),
            es_agente=es_agente
        )

        # Procesar archivos con validación de tamaño y tipo
        try:
            archivos = request.FILES.getlist('archivos') if hasattr(request, 'FILES') else []
            MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
            ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 
                           'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
            
            for f in archivos:
                # Validar tamaño
                if f.size > MAX_FILE_SIZE:
                    return Response(
                        {"error": f"Archivo '{f.name}' excede el tamaño máximo de 10 MB"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Validar tipo MIME
                mime_type = getattr(f, 'content_type', '')
                if mime_type not in ALLOWED_TYPES:
                    return Response(
                        {"error": f"Tipo de archivo no permitido: {mime_type}. Permitidos: imágenes, PDF, Word"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Crear attachment
                att = Attachment.objects.create(
                    mensaje=mensaje,
                    archivo=f,
                    nombre_original=getattr(f, 'name', '')[:255],
                    mime_type=mime_type[:100],
                    tamano=getattr(f, 'size', None)
                )
        except Response:
            # Si hay error de validación, eliminar el mensaje y retornar error
            mensaje.delete()
            raise
        except Exception:
            # No fallar si algo sale mal (pero loguear)
            pass

        # Actualizar estado del ticket a "En Proceso" si el agente responde
        if es_agente and ticket.estado == 'Nuevo':
            ticket.estado = 'En Proceso'
            ticket.save()

        # Crear notificación persistente si el agente responde
        if es_agente and ticket.user:
            try:
                Notification.objects.create(
                    recipient=ticket.user,
                    tipo='ticket_response',
                    titulo='Nueva Respuesta en Ticket',
                    mensaje=f'Un agente respondió a tu ticket: "{ticket.titulo or ticket.descripcion[:100]}"',
                    icono='fa-envelope-open',
                    ticket_id=ticket.id,
                    data_json={'ticket_id': ticket.id, 'respondent': user.username}
                )
                logger.info(f'[Notificaciones] Notificación creada en BD para usuario {ticket.user.id}')
                
                # Enviar por WebSocket si está conectado el usuario
                send_ws_notification(ticket.user.id, 'Nueva Respuesta en Ticket', ticket.id)
            except Exception as e:
                logger.error(f'[Notificaciones] Error creando notificación para usuario: {str(e)}')

        # Crear notificación persistente si un USUARIO responde -> notificar al agente responsable
        if (not es_agente) and ticket:
            try:
                # Intentar encontrar al agente asignado por username en ticket.responsable
                assigned_agent_user = None
                if ticket.responsable:
                    assigned_agent_user = CustomUser.objects.filter(username__iexact=ticket.responsable, rol='agente').first()

                # Si hay un agente asignado válido, crear una notificación para ese agente
                if assigned_agent_user:
                    try:
                        Notification.objects.create(
                            recipient=assigned_agent_user,
                            tipo='ticket_response',
                            titulo='Nueva Respuesta en Ticket',
                            mensaje=f'El usuario respondió al ticket: "{ticket.titulo or ticket.descripcion[:100]}"',
                            icono='fa-envelope-open',
                            ticket_id=ticket.id,
                            data_json={'ticket_id': ticket.id, 'from_user': user.username}
                        )
                        logger.info(f'[Notificaciones] Notificación creada en BD para agente {assigned_agent_user.id}')
                        send_ws_notification(assigned_agent_user.id, 'Nueva Respuesta en Ticket', ticket.id)
                    except Exception as e:
                        logger.error(f'[Notificaciones] Error creando notificación para agente asignado: {str(e)}')
                else:
                    # Si no hay agente asignado encontrado, crear notificaciones para todos los agentes (broadcast)
                    agentes = Agente.objects.all()
                    if agentes.exists():
                        for ag in agentes:
                            try:
                                Notification.objects.create(
                                    recipient=ag.user,
                                    tipo='ticket_response',
                                    titulo='Nueva Respuesta en Ticket',
                                    mensaje=f'El usuario respondió al ticket: "{ticket.titulo or ticket.descripcion[:100]}"',
                                    icono='fa-envelope-open',
                                    ticket_id=ticket.id,
                                    data_json={'ticket_id': ticket.id, 'from_user': user.username}
                                )
                                logger.info(f'[Notificaciones] Notificación creada en BD para agente {ag.user.id}')
                                send_ws_notification(ag.user.id, 'Nueva Respuesta en Ticket', ticket.id)
                            except Exception as e:
                                logger.error(f'[Notificaciones] Error creando notificación para agente {ag.user.id}: {str(e)}')
            except Exception as e:
                logger.error(f'[Notificaciones] Error general en notificación de usuario: {str(e)}')

        from .serializers import MensajeSerializer
        serializer = MensajeSerializer(mensaje, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# -------------------------
# VIEWS BASADAS EN APIView
# -------------------------
class UserRegisterView(generics.CreateAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]


# Vistas de registro completo usando los serializers FullRegister
class AdminFullRegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = AdminFullRegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Admin creado correctamente"}, status=status.HTTP_201_CREATED)
        return Response({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class AgenteFullRegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = AgenteFullRegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Agente creado correctamente"}, status=status.HTTP_201_CREATED)
        return Response({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class UsuarioFullRegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UsuarioFullRegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Usuario creado correctamente"}, status=status.HTTP_201_CREATED)
        return Response({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")

        if not email or not password:
            return Response({"error": "Debe enviar email y password"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = CustomUser.objects.get(email=email)
        except CustomUser.DoesNotExist:
            return Response({"error": "Usuario no encontrado"}, status=status.HTTP_404_NOT_FOUND)

        if not user.check_password(password):
            return Response({"error": "Contraseña incorrecta"}, status=status.HTTP_400_BAD_REQUEST)

        # Genera tokens JWT
        refresh = RefreshToken.for_user(user)
        access = str(refresh.access_token)

        return Response({
            "message": "Login exitoso",
            "access": access,
            "refresh": str(refresh),
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "rol": user.rol,
                "first_name": user.first_name,
                "last_name": user.last_name
            }
        }, status=status.HTTP_200_OK)


# ========== CHAT EN TIEMPO REAL ==========
class ConversacionChatViewSet(ModelViewSet):
    serializer_class = ConversacionChatSerializer
    permission_classes = [IsAuthenticated]
    # Deshabilitar paginación para que el endpoint devuelva una lista
    # simple (frontend espera un array y no un objeto paginado)
    pagination_class = None

    def get_queryset(self):
        # Mostrar conversaciones del usuario actual (puede ser usuario o agente)
        # Una conversación pertenece al user si es usuario O otro_usuario
        user = self.request.user
        from django.db.models import Q
        return ConversacionChat.objects.filter(
            Q(usuario=user) | Q(otro_usuario=user)
        ).order_by('-ultima_actividad')

    @action(detail=False, methods=['post'])
    def por_email(self, request):
        """
        Inicia una conversación con otro usuario por su email.
        Crea la conversación si no existe. Permite conversaciones entre cualquier rol.
        Payload: {"email": "otro@example.com"}
        """
        email = request.data.get('email')

        if not email:
            return Response({"error": "Se requiere el campo 'email'"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target = CustomUser.objects.get(email=email)
        except CustomUser.DoesNotExist:
            return Response({"error": "No se encontró usuario con ese email"}, status=status.HTTP_404_NOT_FOUND)

        requester = request.user
        
        # No permitir conversación consigo mismo
        if requester.id == target.id:
            return Response({"error": "No puedes iniciar una conversación contigo mismo"}, status=status.HTTP_400_BAD_REQUEST)

        # Crear o recuperar conversación entre ambos usuarios
        # Para evitar duplicados (A->B vs B->A), siempre ordenamos por ID
        if requester.id < target.id:
            conversacion, created = ConversacionChat.objects.get_or_create(
                usuario=requester,
                otro_usuario=target
            )
        else:
            conversacion, created = ConversacionChat.objects.get_or_create(
                usuario=target,
                otro_usuario=requester
            )

        serializer = self.get_serializer(conversacion)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def buscar(self, request):
        """Buscar usuarios por correo (q=texto) devuelve lista de usuarios básicos"""
        q = request.query_params.get('q', '').strip()
        if not q:
            return Response([], status=status.HTTP_200_OK)

        users = CustomUser.objects.filter(email__icontains=q)[:20]
        data = [{"id": u.id, "email": u.email, "username": u.username, "rol": u.rol} for u in users]
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def mensajes(self, request, pk=None):
        """Obtiene los mensajes de una conversación"""
        conversacion = self.get_object()
        
        # Verificar que el usuario sea uno de los participantes
        if conversacion.usuario != request.user and conversacion.otro_usuario != request.user:
            return Response(
                {"error": "No tienes permiso para ver esta conversación"},
                status=status.HTTP_403_FORBIDDEN
            )

        mensajes = conversacion.mensajes.all()
        serializer = MensajeChatSerializer(mensajes, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def enviar_mensaje(self, request, pk=None):
        """Envía un mensaje en una conversación"""
        conversacion = self.get_object()

        # Verificar que el usuario sea uno de los participantes
        if conversacion.usuario != request.user and conversacion.otro_usuario != request.user:
            return Response(
                {"error": "No tienes permiso"},
                status=status.HTTP_403_FORBIDDEN
            )

        texto = request.data.get('texto')
        if not texto or not texto.strip():
            return Response(
                {"error": "El mensaje no puede estar vacío"},
                status=status.HTTP_400_BAD_REQUEST
            )

        es_agente = request.user.rol == 'agente'
        
        mensaje = MensajeChat.objects.create(
            conversacion=conversacion,
            remitente=request.user,
            texto=texto.strip(),
            es_agente=es_agente
        )

        # Actualizar última actividad
        conversacion.save()

        # Notificar a través del channel layer para que los clientes WebSocket
        # conectados a la conversación reciban el mensaje en tiempo real.
        try:
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f'chat_conversacion_{conversacion.id}',
                {
                    'type': 'chat_message',
                    'conversacionId': conversacion.id,
                    'mensaje': mensaje.texto,
                    'usuario': getattr(request.user, 'username', 'anon'),
                    'es_agente': es_agente,
                    'fecha': mensaje.fecha.isoformat(),
                }
            )
        except Exception:
            # No fallar la petición aunque falle el envío por channels
            pass
        serializer = MensajeChatSerializer(mensaje)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'])
    def leido(self, request, pk=None):
        """Marca una conversación como leída"""
        conversacion = self.get_object()
        conversacion.save()  # Actualiza última_actividad
        return Response({"status": "ok"})


class AdminUsersAggregatesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, format=None):
        # Only admins should access this
        try:
            if getattr(request.user, 'rol', None) != 'admin':
                return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        except Exception:
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        users = CustomUser.objects.all().annotate(
            tickets_total=Count('tickets'),
            tickets_closed=Count('tickets', filter=Q(tickets__estado='Cerrado')),
            tickets_open=Count('tickets', filter=~Q(tickets__estado='Cerrado')),
        ).order_by('-tickets_total')

        data = []
        for u in users:
            data.append({
                'id': u.id,
                'username': u.username,
                'email': u.email,
                'rol': u.rol,
                'first_name': getattr(u, 'first_name', None),
                'last_name': getattr(u, 'last_name', None),
                'tickets_total': u.tickets_total,
                'tickets_closed': u.tickets_closed,
                'tickets_open': u.tickets_open,
                'is_active': u.is_active,
                'date_joined': u.date_joined,
            })

        return Response(data)


# -------------------------
# Estadísticas de tickets
# -------------------------
class TicketsAvgResolutionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, format=None):
        # Solo admin
        if getattr(request.user, 'rol', None) != 'admin':
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        # Para aproximar el tiempo de resolucion, usamos la diferencia entre
        # la fecha de creación del ticket y la fecha del último mensaje
        # asociado al ticket, solo para tickets cuyo estado sea 'Cerrado'.
        from django.db.models import F
        closed_tickets = Ticket.objects.filter(estado__iexact='Cerrado')
        # unir con mensajes para obtener la última fecha de mensaje
        # calculamos por ticket la diferencia media en horas
        total_seconds = 0
        count = 0
        for t in closed_tickets:
            last_msg = t.mensajes.order_by('-fecha').first()
            if last_msg:
                delta = (last_msg.fecha - t.fecha).total_seconds()
                total_seconds += max(delta, 0)
                count += 1

        avg_hours = (total_seconds / count / 3600.0) if count > 0 else 0
        return Response({'avg_hours': round(avg_hours, 2), 'tickets_counted': count}, status=status.HTTP_200_OK)


class TicketsStatusCountsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, format=None):
        if getattr(request.user, 'rol', None) != 'admin':
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        total = Ticket.objects.count()
        closed = Ticket.objects.filter(estado__iexact='Cerrado').count()
        open_t = total - closed
        return Response({'total': total, 'open': open_t, 'closed': closed}, status=status.HTTP_200_OK)


class TicketsByCategoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, format=None):
        if getattr(request.user, 'rol', None) != 'admin':
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        qs = Ticket.objects.values('categoria').annotate(count=Count('id')).order_by('-count')
        data = [{'category': x['categoria'], 'count': x['count']} for x in qs]
        return Response(data, status=status.HTTP_200_OK)


class TicketsTrendView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, format=None):
        if getattr(request.user, 'rol', None) != 'admin':
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        # Últimos 30 días
        today = timezone.now().date()
        start = today - timezone.timedelta(days=29)
        qs = (
            Ticket.objects
            .filter(fecha__date__gte=start)
            .annotate(day=TruncDate('fecha'))
            .values('day')
            .annotate(count=Count('id'))
            .order_by('day')
        )
        # completar días faltantes
        series = {item['day']: item['count'] for item in qs}
        out = []
        cur = start
        while cur <= today:
            out.append({'date': cur.isoformat(), 'count': series.get(cur, 0)})
            cur = cur + timezone.timedelta(days=1)

        return Response(out, status=status.HTTP_200_OK)


class TicketsAllStatsView(APIView):
    """
    Devuelve un JSON con todos los indicadores importantes para el dashboard:
    - users_total
    - tickets: total/open/closed
    - avg_resolution: avg_hours, tickets_counted
    - by_category: [{ category, count }]
    - trend: [{ date, count }]
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, format=None):
        if getattr(request.user, 'rol', None) != 'admin':
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        # users total
        users_total = CustomUser.objects.count()

        # tickets counts
        total = Ticket.objects.count()
        closed = Ticket.objects.filter(estado__iexact='Cerrado').count()
        open_t = total - closed

        # avg resolution (reuse previous logic)
        total_seconds = 0
        count = 0
        for t in Ticket.objects.filter(estado__iexact='Cerrado'):
            last_msg = t.mensajes.order_by('-fecha').first()
            if last_msg:
                delta = (last_msg.fecha - t.fecha).total_seconds()
                total_seconds += max(delta, 0)
                count += 1
        avg_hours = (total_seconds / count / 3600.0) if count > 0 else 0

        # by category
        qs = Ticket.objects.values('categoria').annotate(count=Count('id')).order_by('-count')
        by_cat = [{'category': x['categoria'], 'count': x['count']} for x in qs]

        # trend (last 30 days)
        today = timezone.now().date()
        start = today - timezone.timedelta(days=29)
        qs2 = (
            Ticket.objects
            .filter(fecha__date__gte=start)
            .annotate(day=TruncDate('fecha'))
            .values('day')
            .annotate(count=Count('id'))
            .order_by('day')
        )
        series = {item['day']: item['count'] for item in qs2}
        out = []
        cur = start
        while cur <= today:
            out.append({'date': cur.isoformat(), 'count': series.get(cur, 0)})
            cur = cur + timezone.timedelta(days=1)

        payload = {
            'users_total': users_total,
            'tickets': {'total': total, 'open': open_t, 'closed': closed},
            'avg_resolution': {'avg_hours': round(avg_hours, 2), 'tickets_counted': count},
            'by_category': by_cat,
            'trend': out
        }

        return Response(payload, status=status.HTTP_200_OK)


# -------------------------
# NOTIFICACIONES
# -------------------------
class NotificationViewSet(ModelViewSet):
    """ViewSet para notificaciones persistentes."""
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        """Retorna solo las notificaciones del usuario actual."""
        return Notification.objects.filter(recipient=self.request.user)

    @action(detail=True, methods=['patch'])
    def marcar_leida(self, request, pk=None):
        """Marca una notificación como leída."""
        notif = self.get_object()
        from django.utils import timezone
        notif.leida = True
        notif.leida_en = timezone.now()
        notif.save()
        serializer = self.get_serializer(notif)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['patch'])
    def marcar_todas_leidas(self, request):
        """Marca todas las notificaciones del usuario como leídas."""
        from django.utils import timezone
        Notification.objects.filter(recipient=request.user, leida=False).update(leida=True, leida_en=timezone.now())
        return Response({'status': 'ok'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def no_leidas(self, request):
        """Retorna el conteo de notificaciones no leídas."""
        count = Notification.objects.filter(recipient=request.user, leida=False).count()
        return Response({'unread_count': count}, status=status.HTTP_200_OK)

