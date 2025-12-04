"""
ASGI config for backend project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

from channels.routing import ProtocolTypeRouter, URLRouter

import cuentas.routing
from cuentas.middleware import JWTAuthMiddleware


application = ProtocolTypeRouter({
	'http': get_asgi_application(),
	# Usamos JWTAuthMiddleware para websockets: lee ?token=... y setea scope['user']
	'websocket': JWTAuthMiddleware(
		URLRouter(
			cuentas.routing.websocket_urlpatterns
		)
	),
})
