from django.urls import path
from main import views

urlpatterns = [
    path('', views.login, name='login'),
]