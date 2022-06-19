# startup application

python webapp/manage.py migrate
python webapp/manage.py createsuperuser --noinput
gunicorn --bind=0.0.0.0 --timeout 600 --chdir webapp webapp.wsgi --access-logfile '-' --error-logfile '-'
