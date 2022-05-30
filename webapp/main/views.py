from django.shortcuts import render
from decouple import config

from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient


def login(request):
  return render(request, 'main/login.html', context= { })