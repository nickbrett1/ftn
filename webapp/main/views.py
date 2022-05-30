from django.shortcuts import render
from decouple import config

def login(request):
  return render(request, 'main/login.html', context=None)