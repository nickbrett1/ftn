'''Module init for webapp'''
# Fix for graphene-django support for django v4
# https://github.com/graphql-python/graphene-django/issues/1284
import django
from django.utils.encoding import force_str
django.utils.encoding.force_text = force_str
