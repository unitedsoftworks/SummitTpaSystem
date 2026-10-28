#!/bin/bash
set -e

python manage.py migrate --noinput

nginx

exec gunicorn summit_tpa.wsgi:application \
    --bind 127.0.0.1:8000 \
    --workers 3 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
