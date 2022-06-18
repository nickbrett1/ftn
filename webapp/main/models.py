"""
Models aka core data structures (db backed) for project
"""
from datetime import datetime
from django.db import models
from django.utils.translation import gettext_lazy as _

class Setting(models.Model):
    '''User Settings'''
    email = models.EmailField(max_length=254, primary_key=True)

    class Page(models.IntegerChoices):
        '''Page choices for landing page'''
        BILLS = 0, _('Bills')
        INFO = 1, _('Info')
    lastPage = models.IntegerField(
        choices=Page.choices
    )

    def __str__(self) -> str:
        return self.email.__str__() + " : " + "(Last Page: " + self.lastPage.__str__() + ")"

class Action(models.Model):
    '''User Action Logging'''
    email = models.EmailField(max_length=254)

    class EventType(models.IntegerChoices):
        '''Types of event'''
        LOGIN = 0, _('Login')
        CHANGE_PAGE = 1, _('Change Page')

    event = models.IntegerField(
        choices=EventType.choices
    )
    time = models.DateTimeField(default=datetime.now)
    args = models.JSONField(null=True)

class InfoCategory(models.Model):
    '''Category of House Information'''
    name = models.CharField(default="", max_length=30)
    image = models.URLField(blank=True, null=True)

    def __str__(self) -> str:
        return self.name.__str__()

class Info(models.Model):
    '''House Information'''
    field = models.CharField(max_length=30, default="")
    value = models.CharField(max_length=50, default="")

    category = models.ForeignKey(InfoCategory, on_delete=models.DO_NOTHING)

    def __str__(self) -> str:
        return self.field.__str__() + " : " + self.value.__str__()

class Bill(models.Model):
    '''Paid bills'''
    date = models.DateField(default=datetime.now)
    tamount = models.FloatField(default=0)
    namount = models.FloatField(default=0)

class Charge(models.Model):
    '''Individual credit card charges'''
    time = models.DateTimeField(default=datetime.now)

    class CreditCard(models.IntegerChoices):
        '''Types of Card'''
        FAT_CHASE = 0, _('Fat Chase')
        FREEDOM = 1, _('Freedom')
        HYATT = 2, _('Hyatt')
        AMAZON = 3, _('Amazon')
    card = models.IntegerField(
        choices=CreditCard.choices
    )
    amount = models.FloatField(default=0.0)
    npayment = models.FloatField(null=True)
    tpayment = models.FloatField(null=True)

    class ChargeStatus(models.IntegerChoices):
        '''Types of status for the charge'''
        UNALLOCATED = 0, _('Unallocated')
        ALLOCATED = 1, _('Allocated')
    status = models.IntegerField(
        choices=ChargeStatus.choices,
        default=0
    )
    bill = models.ForeignKey(Bill, on_delete=models.DO_NOTHING, null=True)
