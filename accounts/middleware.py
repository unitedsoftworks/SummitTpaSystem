import threading

from django.utils.deprecation import MiddlewareMixin

_thread_local = threading.local()


def get_current_user():
    return getattr(_thread_local, 'user', None)


class TenantMiddleware(MiddlewareMixin):
    def process_request(self, request):
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return
        scope = request.user.get_employer_scope()
        if scope is not None:
            request.tenant_employers = scope
        _thread_local.user = request.user


class AuditMiddleware(MiddlewareMixin):
    AUDIT_METHODS = ('POST', 'PUT', 'PATCH', 'DELETE')

    def process_response(self, request, response):
        if request.method not in self.AUDIT_METHODS:
            return response
        if response.status_code >= 400:
            return response
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return response

        action_map = {
            'POST': 'create',
            'PUT': 'update',
            'PATCH': 'update',
            'DELETE': 'delete',
        }
        path_parts = request.path.strip('/').split('/')
        entity_type = path_parts[1] if len(path_parts) > 1 else 'unknown'
        entity_id = None
        for part in path_parts[2:]:
            if part.isdigit():
                entity_id = part
                break

        try:
            from core.models import AuditLog
            AuditLog.objects.create(
                action=action_map.get(request.method, request.method.lower()),
                entity_type=entity_type,
                entity_id=entity_id,
                performed_by=request.user.get_full_name() or request.user.username,
                details=f"{request.method} {request.path}",
            )
        except Exception:
            pass

        return response
