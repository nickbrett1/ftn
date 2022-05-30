DEBUG = True

ALLOWED_HOSTS = ['localhost']

from decouple import config
SECRET_KEY = config("SECRET_KEY")
