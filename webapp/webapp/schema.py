"""
GraphQL Schema for app
"""
import graphene
from graphene_django import DjangoObjectType

from main.models import Info, InfoCategory

class InfoType(DjangoObjectType):
    '''Information to display'''
    class Meta:
        '''Metadata about the InfoType'''
        model = Info
        fields = ('id', 'field', 'value', 'category')

class InfoCategoryType(DjangoObjectType):
    '''Information Category to display'''
    class Meta:
        '''Metadata about the InfoCategoryType'''
        model = InfoCategory
        fields = ('id', 'name', 'image')

class Query(graphene.ObjectType):
    '''GraphQL queries'''
    all_infos = graphene.List(InfoType)
    category_by_name = graphene.Field(InfoCategoryType, name=graphene.String(required=True))

    def resolve_all_infos(self, info):
        # pylint: disable=unused-argument
        '''Retrieve all information objects'''
        return Info.objects.select_related('category').all()

    def resolve_category_by_name(self, name):
        '''Find a category by name'''
        try:
            return InfoCategory.objects.get(name=name)
        except InfoCategory.DoesNotExist:
            return None

schema = graphene.Schema(query=Query)
