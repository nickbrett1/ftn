from django.shortcuts import render
from decouple import config

def main(request):
  return render(request, 'main/index.html', context= { })