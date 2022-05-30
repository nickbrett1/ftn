from django.shortcuts import render
from decouple import config

from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient


def login(request):
  try:
    secret = SecretClient(vault_url = "https://nickbrett-bem-azvault.vault.azure.net/", 
                            credential = DefaultAzureCredential()).get_secret('djangosecret')
    return render(request, 'main/login.html', context= { 'secret' : secret })
  except:
    return render(request, 'main/login.html', context= { 'secret' : None })