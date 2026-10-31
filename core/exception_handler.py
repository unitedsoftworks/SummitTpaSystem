import traceback

from django.conf import settings
from rest_framework.views import exception_handler


def debug_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is None and settings.DEBUG:
        from rest_framework.response import Response
        from rest_framework import status

        tb = traceback.format_exception(type(exc), exc, exc.__traceback__)
        return Response(
            {
                'error': str(exc),
                'exception_type': type(exc).__name__,
                'traceback': tb,
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    if response is not None and settings.DEBUG:
        response.data['exception_type'] = type(exc).__name__

    return response
