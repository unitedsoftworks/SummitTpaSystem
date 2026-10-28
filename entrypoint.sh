#!/bin/bash
set -e

python manage.py collectstatic --noinput 2>/dev/null || true
python manage.py migrate --noinput

exec gunicorn summit_tpa.wsgi:application \
    --bind 0.0.0.0:3000 \
    --workers 3 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
