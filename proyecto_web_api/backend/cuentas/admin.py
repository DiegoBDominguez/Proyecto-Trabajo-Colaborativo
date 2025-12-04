from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, Admin as AdminPerfil, Agente, Usuario, Ticket, Mensaje, ConversacionChat, MensajeChat

@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (('Rol', {'fields': ('rol',)}),)
    list_display = ('username','email','rol','is_staff','is_active')
    list_filter = ('rol','is_staff','is_active')

admin.site.register(AdminPerfil)
admin.site.register(Agente)
admin.site.register(Usuario)
admin.site.register(Ticket)
admin.site.register(Mensaje)
admin.site.register(ConversacionChat)
admin.site.register(MensajeChat)
