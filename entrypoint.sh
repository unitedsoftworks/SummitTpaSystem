#!/bin/bash
set -e

python manage.py collectstatic --noinput 2>/dev/null || true
python manage.py migrate --noinput

nginx -t
nginx

exec gunicorn summit_tpa.wsgi:application \
    --bind 127.0.0.1:8000 \
    --workers 3 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
