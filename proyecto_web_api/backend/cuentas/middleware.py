from urllib.parse import parse_qs
from channels.middleware import BaseMiddleware
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from channels.db import database_sync_to_async


class JWTAuthMiddleware(BaseMiddleware):
    """Middleware para autenticar WebSocket usando JWT pasado en querystring.

    Lee `?token=...` y valida el AccessToken de SimpleJWT. Si es válido,
    carga el usuario y lo pone en `scope['user']`.
    """

    async def __call__(self, scope, receive, send):
        # Copiar scope mutable
        scope = dict(scope)
        query_string = scope.get('query_string', b'').decode()
        qs = parse_qs(query_string)
        token = qs.get('token', [None])[0]

        scope['user'] = AnonymousUser()

        if token:
            try:
                access = AccessToken(token)
                user_id = access.get('user_id')
                if user_id is not None:
                    User = get_user_model()
                    try:
                        user = await database_sync_to_async(User.objects.get)(id=user_id)
                        scope['user'] = user
                    except User.DoesNotExist:
                        scope['user'] = AnonymousUser()
            except Exception:
                # token inválido/expirado -> anonymous
                scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)
