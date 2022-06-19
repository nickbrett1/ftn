# startup application

gunicorn --bind=0.0.0.0 --timeout 600 --chdir webapp webapp.wsgi --access-logfile '-' --error-logfile '-'
python webapp/manage.py migrate