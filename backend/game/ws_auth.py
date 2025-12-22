from urllib.parse import parse_qs

from django.contrib.auth.models import AnonymousUser
from channels.db import database_sync_to_async
from rest_framework.authtoken.models import Token


@database_sync_to_async
def _get_user_from_token(token_key: str):
    try:
        token = Token.objects.select_related("user").get(key=token_key)
        return token.user
    except Token.DoesNotExist:
        return AnonymousUser()


class TokenAuthMiddleware:
    """
    WebSocket için:
    ws://127.0.0.1:8001/ws/rooms/6/?token=YOUR_TOKEN

    - token varsa TokenAuthentication gibi user set eder
    - token yoksa scope['user'] (session) neyse onu korur
    """

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        # Zaten session ile authenticated geldiyse dokunma
        user = scope.get("user")
        if user and getattr(user, "is_authenticated", False):
            return await self.inner(scope, receive, send)

        qs = parse_qs(scope.get("query_string", b"").decode())
        token_key = (qs.get("token") or [None])[0]

        if token_key:
            scope["user"] = await _get_user_from_token(token_key)
        else:
            scope["user"] = scope.get("user") or AnonymousUser()

        return await self.inner(scope, receive, send)
