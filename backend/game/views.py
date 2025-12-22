import random

from django.contrib.auth import authenticate, get_user_model, login
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.db.models import F
from django.shortcuts import render
from django.utils import timezone

from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authtoken.models import Token

from .models import Room, BetSettings, AccountTransaction

User = get_user_model()


class ApiLoginView(APIView):
    """
    React için:
    POST /api/auth/login/  { "username": "...", "password": "..." }
    -> { "token": "...", "user": {...} }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        username = (request.data.get("username") or "").strip()
        password = request.data.get("password") or ""

        user = authenticate(username=username, password=password)
        if not user:
            return Response(
                {"non_field_errors": ["Unable to log in with provided credentials."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Session'ı da açalım (admin/template tarafını kolaylaştırır; React’ı bozmaz)
        try:
            login(request, user)
        except Exception:
            pass

        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "user": {"id": user.id, "username": user.username}})


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        u = request.user
        return Response(
            {
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "role": getattr(u, "role", "user"),
                "balance": getattr(u, "balance", 0),
            }
        )


def _validate_bet_amount(bet_amount: int) -> tuple[bool, str]:
    settings_obj = BetSettings.objects.first()
    if not settings_obj:
        return True, ""

    if bet_amount < settings_obj.min_bet or bet_amount > settings_obj.max_bet:
        return False, "bet_amount out of allowed range"

    if ((bet_amount - settings_obj.min_bet) % settings_obj.step) != 0:
        return False, "bet_amount must follow step"

    return True, ""


def _start_game_lock_and_init(room: Room):
    """
    Room FULL olduğunda (player2 set edildikten sonra):
    - iki oyuncudan bet düş (kilitle)
    - AccountTransaction yaz
    - room state init et (secret/current_turn/started_at/is_locked/turn_count)
    """
    if room.is_locked:
        return
    if not room.player1_id or not room.player2_id:
        return

    p1 = User.objects.select_for_update().get(id=room.player1_id)
    p2 = User.objects.select_for_update().get(id=room.player2_id)

    if p1.balance < room.bet_amount:
        raise ValueError("Player1 has insufficient balance")
    if p2.balance < room.bet_amount:
        raise ValueError("Player2 has insufficient balance")

    User.objects.filter(id=p1.id).update(balance=F("balance") - room.bet_amount)
    User.objects.filter(id=p2.id).update(balance=F("balance") - room.bet_amount)

    p1.refresh_from_db(fields=["balance"])
    p2.refresh_from_db(fields=["balance"])

    AccountTransaction.objects.create(
        user=p1,
        room=room,
        type=AccountTransaction.Type.BET_LOCK,
        amount=-room.bet_amount,
        balance_after=int(p1.balance),
        note=f"Bet locked for room {room.id}",
    )
    AccountTransaction.objects.create(
        user=p2,
        room=room,
        type=AccountTransaction.Type.BET_LOCK,
        amount=-room.bet_amount,
        balance_after=int(p2.balance),
        note=f"Bet locked for room {room.id}",
    )

    if room.secret_number is None:
        room.secret_number = random.randint(1, 100)

    # yazı-tura: iki oyuncudan random
    room.current_turn_id = random.choice([room.player1_id, room.player2_id])

    room.turn_count = room.turn_count or 0
    room.is_locked = True
    room.status = Room.Status.FULL
    room.started_at = room.started_at or timezone.now()

    room.save(
        update_fields=[
            "secret_number",
            "current_turn",  # field adı bu
            "turn_count",
            "started_at",
            "is_locked",
            "status",
        ]
    )


class RoomListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        rooms = Room.objects.all().order_by("-id")
        data = [
            {
                "id": r.id,
                "bet_amount": r.bet_amount,
                "status": r.status,
                "player1_id": r.player1_id,
                "player2_id": r.player2_id,
                "player_count": r.player_count,
                "created_at": r.created_at.isoformat() if getattr(r, "created_at", None) else None,
            }
            for r in rooms
        ]
        return Response(data)

    def post(self, request):
        bet_amount = request.data.get("bet_amount")
        if bet_amount is None:
            return Response({"detail": "bet_amount is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            bet_amount = int(bet_amount)
        except (TypeError, ValueError):
            return Response({"detail": "bet_amount must be an integer"}, status=status.HTTP_400_BAD_REQUEST)

        ok, msg = _validate_bet_amount(bet_amount)
        if not ok:
            return Response({"detail": msg}, status=status.HTTP_400_BAD_REQUEST)

        if request.user.balance < bet_amount:
            return Response({"detail": "Insufficient balance to create room"}, status=status.HTTP_400_BAD_REQUEST)

        room = Room.objects.create(bet_amount=bet_amount, status=Room.Status.OPEN, player1=request.user)

        return Response(
            {
                "id": room.id,
                "bet_amount": room.bet_amount,
                "status": room.status,
                "player1_id": room.player1_id,
                "player2_id": room.player2_id,
                "player_count": room.player_count,
            },
            status=status.HTTP_201_CREATED,
        )


class RoomJoinView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, room_id):
        with transaction.atomic():
            room = (
                Room.objects.select_for_update()
                .select_related("player1", "player2")
                .filter(id=room_id)
                .first()
            )
            if not room:
                return Response({"detail": "Room not found"}, status=status.HTTP_404_NOT_FOUND)

            if room.status == Room.Status.FINISHED:
                return Response({"detail": "Room already finished"}, status=status.HTTP_400_BAD_REQUEST)

            if room.player1_id == request.user.id:
                return Response({"detail": "Cannot join your own room"}, status=status.HTTP_400_BAD_REQUEST)

            if room.player2_id is not None:
                return Response({"detail": "Room is full"}, status=status.HTTP_400_BAD_REQUEST)

            room.player2 = request.user
            room.status = Room.Status.FULL
            room.save(update_fields=["player2", "status"])

            try:
                _start_game_lock_and_init(room)
            except ValueError as e:
                room.player2 = None
                room.status = Room.Status.OPEN
                room.save(update_fields=["player2", "status"])
                return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"detail": "Joined room successfully"})


class TransactionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = AccountTransaction.objects.filter(user=request.user).select_related("room").order_by("-created_at", "-id")

        data = []
        for t in qs[:200]:
            created = getattr(t, "created_at", None)
            amount = int(getattr(t, "amount", 0) or 0)
            t_type = getattr(t, "type", None)

            room_bet = 0
            if t.room_id and getattr(t, "room", None):
                room_bet = int(getattr(t.room, "bet_amount", 0) or 0)

            net_change = amount
            if t_type == AccountTransaction.Type.PAYOUT and t.room_id:
                net_change = amount - room_bet

            data.append(
                {
                    "id": t.id,
                    "type": t_type,
                    "amount": amount,
                    "net_change": net_change,
                    "balance_after": getattr(t, "balance_after", None),
                    "room_id": t.room_id,
                    "room_bet_amount": room_bet,
                    "note": getattr(t, "note", ""),
                    "created_at": created.isoformat() if created else None,
                }
            )
        return Response(data)


class LeaderboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = User.objects.all().order_by("-balance", "id")[:50]
        data = [{"id": u.id, "username": u.username, "balance": getattr(u, "balance", 0)} for u in qs]
        return Response(data)


@login_required
def play_room_view(request, room_id: int):
    with transaction.atomic():
        room = (
            Room.objects.select_for_update()
            .select_related("player1", "player2")
            .filter(id=room_id)
            .first()
        )
        if room is None:
            return render(request, "game/play_room.html", {"error": "Room not found", "room_id": room_id}, status=404)

        if request.user.id in (room.player1_id, room.player2_id):
            if room.player2_id is not None and room.status not in (Room.Status.FULL, Room.Status.FINISHED):
                room.status = Room.Status.FULL
                room.save(update_fields=["status"])

            if room.player2_id is not None and room.status == Room.Status.FULL and not room.is_locked:
                _start_game_lock_and_init(room)

        else:
            if room.status == Room.Status.OPEN and room.player2_id is None and request.user.id != room.player1_id:
                room.player2 = request.user
                room.status = Room.Status.FULL
                room.save(update_fields=["player2", "status"])

                try:
                    _start_game_lock_and_init(room)
                except ValueError as e:
                    room.player2 = None
                    room.status = Room.Status.OPEN
                    room.save(update_fields=["player2", "status"])
                    return render(request, "game/play_room.html", {"error": str(e), "room_id": room_id}, status=400)
            else:
                return render(
                    request,
                    "game/play_room.html",
                    {"error": "Bu odaya katılımcı değilsin.", "room_id": room_id},
                    status=403,
                )

    return render(request, "game/play_room.html", {"room_id": room_id})


@login_required
def lobby_view(request):
    return render(request, "game/lobby.html")
