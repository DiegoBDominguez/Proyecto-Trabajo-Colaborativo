from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from view.admin import CustomUser, Admin as AdminPerfil, Agente, Usuario

@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (('Rol', {'fields': ('rol',)}),)
    list_display = ('username','email','rol','is_staff','is_active')
    list_filter = ('rol','is_staff','is_active')

admin.site.register(AdminPerfil)
admin.site.register(Agente)
admin.site.register(Usuario)
