from channels.generic.websocket import AsyncWebsocketConsumer
import logging
import json
from asgiref.sync import sync_to_async
from .models import Ticket, Mensaje, ConversacionChat, MensajeChat, CustomUser
from urllib.parse import parse_qs
from channels.db import database_sync_to_async


# Helper: comprobar si un usuario pertenece a la conversación
@database_sync_to_async
def user_in_conversation(user_id, conversacion_id):
    if not user_id:
        return False
    return ConversacionChat.objects.filter(id=conversacion_id, usuario_id=user_id).exists() or ConversacionChat.objects.filter(id=conversacion_id, agente_id=user_id).exists()


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # ticket_id viene de la URL: ws://.../ws/chat/101/
        self.ticket_id = self.scope['url_route']['kwargs']['ticket_id']
        self.room_group_name = f'chat_ticket_{self.ticket_id}'
        self.user = self.scope.get('user')

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        mensaje_texto = data.get('mensaje')
        es_agente = data.get('esAgente', False)

        mensaje = None
        if mensaje_texto:
            mensaje = await self.save_mensaje(mensaje_texto, es_agente)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'mensaje': mensaje_texto,
                'usuario': getattr(self.user, 'username', 'anon'),
                'es_agente': es_agente,
                'fecha': mensaje.fecha.isoformat() if mensaje else None,
            }
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message',
            'mensaje': event['mensaje'],
            'usuario': event['usuario'],
            'esAgente': event['es_agente'],
            'fecha': event['fecha'],
        }))

    @sync_to_async
    def save_mensaje(self, texto, es_agente):
        try:
            ticket = Ticket.objects.get(id=self.ticket_id)
            usuario = self.user if getattr(self.user, 'is_authenticated', False) else None
            mensaje = Mensaje.objects.create(
                ticket=ticket,
                usuario=usuario,
                texto=texto,
                es_agente=es_agente
            )
            return mensaje
        except Ticket.DoesNotExist:
            return None


class NotificationConsumer(AsyncWebsocketConsumer):
    """Consumer para notificaciones en tiempo real."""
    
    async def connect(self):
        logger = logging.getLogger(__name__)
        self.user = self.scope.get('user')

        logger.debug("NotificationConsumer: connect attempt, user=%s", getattr(self.user, 'id', None))
        # Solo conectar si el usuario está autenticado
        if not getattr(self.user, 'is_authenticated', False):
            logger.debug("NotificationConsumer: unauthenticated, closing connection")
            await self.close()
            return

        # Crear grupo por usuario para notificaciones
        self.room_group_name = f'notifications_{self.user.id}'

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()
        logger.debug("NotificationConsumer: accepted connection for user=%s, group=%s", self.user.id, self.room_group_name)

        # Enviar notificaciones no leídas pendientes
        try:
            await self.send_pending_notifications()
        except Exception:
            logger.exception("NotificationConsumer: error sending pending notifications for user=%s", getattr(self.user, 'id', None))
    
    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
    
    async def receive(self, text_data):
        # Recibir ping o mark_read requests del cliente
        try:
            data = json.loads(text_data)
            action = data.get('action')
            
            if action == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
            elif action == 'mark_read' and 'notification_id' in data:
                await self.mark_notification_read(data['notification_id'])
        except Exception:
            pass
    
    async def notification_message(self, event):
        """Envía una notificación al cliente."""
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'id': event.get('id'),
            'titulo': event.get('titulo'),
            'ticket_id': event.get('ticket_id')
        }))
    
    async def send_pending_notifications(self):
        """Envía las notificaciones no leídas pendientes al conectar.

        Ejecuta la consulta de forma segura y envía cada notificación
        usando `await self.send(...)` dentro del bucle de eventos.
        """
        logger = logging.getLogger(__name__)
        try:
            from .models import Notification

            # Recuperar id de notificaciones de forma síncrona en threadpool
            rows = await database_sync_to_async(list)(
                Notification.objects.filter(recipient=self.user, leida=False).values('id', 'titulo', 'mensaje', 'ticket_id', 'creada')[:20]
            )

            logger.debug("NotificationConsumer: found %s pending notifications for user=%s", len(rows), getattr(self.user, 'id', None))

            for notif in rows:
                payload = {
                    'type': 'pending_notification',
                    'notification': {
                        'id': notif.get('id'),
                        'titulo': notif.get('titulo'),
                        'mensaje': notif.get('mensaje'),
                        'ticket_id': notif.get('ticket_id'),
                        'creada': notif.get('creada').isoformat() if notif.get('creada') else None,
                    }
                }
                try:
                    await self.send(text_data=json.dumps(payload))
                except Exception:
                    logger.exception("NotificationConsumer: error sending pending notification %s to user=%s", notif.get('id'), getattr(self.user, 'id', None))
        except Exception:
            logger.exception("NotificationConsumer: unexpected error while fetching pending notifications for user=%s", getattr(self.user, 'id', None))
    
    @database_sync_to_async
    def mark_notification_read(self, notification_id):
        """Marca una notificación como leída."""
        from .models import Notification
        from django.utils import timezone
        
        try:
            notif = Notification.objects.get(id=notification_id, recipient=self.user)
            notif.leida = True
            notif.leida_en = timezone.now()
            notif.save()
        except Notification.DoesNotExist:
            pass


class ChatGeneralConsumer(AsyncWebsocketConsumer):
    """Consumer para conversaciones generales (no por ticket)."""
    async def connect(self):
        # leer token (ya validado por middleware) y unir al/los grupos
        self.user = self.scope.get('user')
        self.joined_groups = set()

        # Añadir al grupo de cada conversación relevante para el usuario
        if getattr(self.user, 'is_authenticated', False):
            try:
                role = getattr(self.user, 'rol', None)
                if role == 'agente':
                    convs = await database_sync_to_async(list)(
                        ConversacionChat.objects.filter(agente=self.user).values_list('id', flat=True)
                    )
                elif role == 'usuario':
                    convs = await database_sync_to_async(list)(
                        ConversacionChat.objects.filter(usuario=self.user).values_list('id', flat=True)
                    )
                elif role == 'admin':
                    # Admin puede ver todas las conversaciones
                    convs = await database_sync_to_async(list)(
                        ConversacionChat.objects.all().values_list('id', flat=True)
                    )
                else:
                    # Roles inesperados no se suscriben a conversaciones
                    convs = []

                for cid in convs:
                    room = f'chat_conversacion_{cid}'
                    await self.channel_layer.group_add(room, self.channel_name)
                    self.joined_groups.add(room)
            except Exception:
                pass

        await self.accept()

    async def disconnect(self, close_code):
        # remover de todos los grupos a los que se unió
        for room in getattr(self, 'joined_groups', []):
            try:
                await self.channel_layer.group_discard(room, self.channel_name)
            except Exception:
                pass

    async def receive(self, text_data):
        data = json.loads(text_data)
        # Esperamos { "conversacionId": 1, "mensaje": "hola" }
        conversacion_id = data.get('conversacionId')
        mensaje_texto = data.get('mensaje')
        es_agente = data.get('esAgente', False)

        mensaje = None
        # Seguridad: verificar que el usuario conectado es parte de la conversación
        if conversacion_id and mensaje_texto:
            allowed = await user_in_conversation(getattr(self.user, 'id', None), conversacion_id)
            if not allowed:
                # Ignorar intentos de envío a conversaciones ajenas
                return
            mensaje = await self.save_chat_mensaje(conversacion_id, mensaje_texto, es_agente)

        # Broadcast a grupo de la conversación
        if conversacion_id:
            room = f'chat_conversacion_{conversacion_id}'
            await self.channel_layer.group_send(
                room,
                {
                    'type': 'chat_message',
                    'conversacionId': conversacion_id,
                    'mensaje': mensaje_texto,
                    'usuario': getattr(self.user, 'username', 'anon'),
                    'es_agente': es_agente,
                    'fecha': mensaje.fecha.isoformat() if mensaje else None,
                }
            )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message',
            'conversacionId': event.get('conversacionId'),
            'mensaje': event.get('mensaje'),
            'usuario': event.get('usuario'),
            'esAgente': event.get('es_agente'),
            'fecha': event.get('fecha'),
        }))

    @database_sync_to_async
    def save_chat_mensaje(self, conversacion_id, texto, es_agente):
        try:
            conv = ConversacionChat.objects.get(id=conversacion_id)
            remitente = None
            # intentar mapear usuario si existe
            if getattr(self.user, 'is_authenticated', False):
                remitente = CustomUser.objects.filter(id=self.user.id).first()

            mensaje = MensajeChat.objects.create(
                conversacion=conv,
                remitente=remitente,
                texto=texto,
                es_agente=es_agente
            )
            # actualizar última actividad
            conv.save()
            return mensaje
        except ConversacionChat.DoesNotExist:
            return None

