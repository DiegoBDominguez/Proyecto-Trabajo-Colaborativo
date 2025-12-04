from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView  # opcional (si usarás refresh)

from .views import (
    UserViewSet, AdminViewSet, AgenteViewSet, UsuarioViewSet, TicketViewSet, ConversacionChatViewSet, NotificationViewSet,
    UserRegisterView,
    AdminFullRegisterView, AgenteFullRegisterView, UsuarioFullRegisterView, LoginView,
    AdminUsersAggregatesView,
    TicketsAvgResolutionView, TicketsStatusCountsView, TicketsByCategoryView, TicketsTrendView, TicketsAllStatsView,
)

router = DefaultRouter()
router.register('users', UserViewSet, basename='users')
router.register('admins', AdminViewSet, basename='admins')
router.register('agentes', AgenteViewSet, basename='agentes')
router.register('usuarios', UsuarioViewSet, basename='usuarios')
router.register('tickets', TicketViewSet, basename='ticket')
router.register('chat/conversaciones', ConversacionChatViewSet, basename='conversaciones')
router.register('notifications', NotificationViewSet, basename='notifications')

urlpatterns = [
    path('register/admin/',   AdminFullRegisterView.as_view(),   name='register_admin'),
    path('register/agente/',  AgenteFullRegisterView.as_view(),  name='register_agente'),
    path('register/usuario/', UsuarioFullRegisterView.as_view(), name='register_usuario'),
    path('register/', UserRegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),  # opcional
    path('admin/users-aggregates/', AdminUsersAggregatesView.as_view(), name='admin_users_aggregates'),
    path('stats/tickets/avg_resolution_time/', TicketsAvgResolutionView.as_view(), name='tickets_avg_resolution'),
    path('stats/tickets/status_counts/', TicketsStatusCountsView.as_view(), name='tickets_status_counts'),
    path('stats/tickets/by_category/', TicketsByCategoryView.as_view(), name='tickets_by_category'),
    path('stats/tickets/trend/', TicketsTrendView.as_view(), name='tickets_trend'),
    path('stats/tickets/all/', TicketsAllStatsView.as_view(), name='tickets_all_stats'),
    
    path('', include(router.urls)),
]
