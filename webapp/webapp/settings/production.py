from webapp.webapp.settings.local import ALLOWED_HOSTS, SECRET_KEY


DEBUG = False

ALLOWED_HOSTS =['nickbrett-bem.azurewebsites.net']

from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient

SECRET_KEY = SecretClient(vault_url = "https://nickbrett-bem-azvault.vault.azure.net/", 
                          credential = DefaultAzureCredential()).get_secret('djangosecret')