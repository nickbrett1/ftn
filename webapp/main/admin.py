"""
Models that can be managed through admin screens
"""

from django.contrib import admin
from .models import Info, InfoCategory, Setting

admin.site.register(Info)
admin.site.register(InfoCategory)
admin.site.register(Setting)
