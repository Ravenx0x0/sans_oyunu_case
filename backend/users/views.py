from django.contrib.auth import authenticate, get_user_model
from django.db import transaction

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authtoken.models import Token

User = get_user_model()


class SignupView(APIView):
    """
    POST /api/auth/signup/
    body: { "username": "...", "password": "...", "email": "...", "age": 25 }
    - age >= 18 değilse 400
    - user oluşturur, başlangıç bakiyesi 1000 atar (modelinde balance varsa)
    - token döner
    """
    permission_classes = [AllowAny]

    def post(self, request):
        username = (request.data.get("username") or "").strip()
        password = request.data.get("password") or ""
        email = (request.data.get("email") or "").strip()
        age = request.data.get("age")

        if not username or not password:
            return Response({"detail": "username and password are required"}, status=400)

        # age kontrolü (mock)
        try:
            age_int = int(age) if age is not None else None
        except (TypeError, ValueError):
            return Response({"detail": "age must be an integer"}, status=400)

        if age_int is not None and age_int < 18:
            return Response({"detail": "Must be 18+"}, status=400)

        if User.objects.filter(username=username).exists():
            return Response({"detail": "username already exists"}, status=400)

        with transaction.atomic():
            user = User.objects.create_user(username=username, password=password, email=email)

            # balance alanı varsa 1000 ver
            if hasattr(user, "balance"):
                user.balance = 1000
                user.save(update_fields=["balance"])

            token, _ = Token.objects.get_or_create(user=user)

        return Response(
            {"token": token.key, "user": {"id": user.id, "username": user.username}},
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    """
    POST /api/auth/login/
    body: { "username": "...", "password": "..." }
    -> { "token": "...", "user": {...} }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        username = (request.data.get("username") or "").strip()
        password = request.data.get("password") or ""

        if not username or not password:
            return Response({"detail": "username and password are required"}, status=400)

        # request'i de verelim (bazı backendlerde auth backend request kullanır)
        user = authenticate(request=request, username=username, password=password)
        if not user:
            return Response(
                {"non_field_errors": ["Unable to log in with provided credentials."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "user": {"id": user.id, "username": user.username}})


class MeView(APIView):
    """
    GET /api/auth/me/
    Header: Authorization: Token <token>
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        u = request.user
        return Response(
            {
                "id": u.id,
                "username": u.username,
                "email": getattr(u, "email", ""),
                "role": getattr(u, "role", "user"),
                "balance": getattr(u, "balance", 0),
            }
        )


# --- Backward compatible aliases (eğer eski importlar varsa patlamasın diye) ---
RegisterView = SignupView
