from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Workspace


@admin.register(Workspace)
class WorkspaceAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'created_at')
    search_fields = ('name',)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('id', 'username', 'email', 'first_name', 'last_name', 'workspace', 'is_staff')
    list_filter = ('is_staff', 'is_superuser', 'is_active', 'workspace')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Workspace Info', {'fields': ('workspace',)}),
    )
