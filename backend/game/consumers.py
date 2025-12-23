import random
import logging

from django.utils import timezone
from django.db import transaction
from django.contrib.auth import get_user_model

from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async

from .models import Room, AccountTransaction

logger = logging.getLogger(__name__)
User = get_user_model()


class RoomConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        try:
            self.room_id = int(self.scope["url_route"]["kwargs"]["room_id"])
            self.group_name = f"room_{self.room_id}"

            user = self.scope.get("user")
            if not user or not getattr(user, "is_authenticated", False):
                await self.close(code=4401)
                return

            state = await self.db_get_room_state()
            if state is None:
                await self.close(code=4404)
                return

            # participant kontrolü: player2 None ise sadece player1 kabul
            allowed_ids = [state["player1_id"]]
            if state["player2_id"]:
                allowed_ids.append(state["player2_id"])

            if user.id not in allowed_ids:
                await self.close(code=4403)
                return

            await self.accept()
            await self.channel_layer.group_add(self.group_name, self.channel_name)

            # Her durumda snapshot gönder
            await self.send_json({"type": "SNAPSHOT", "payload": state["snapshot"]})

            # FULL değilse sadece bekle
            if state["player2_id"] is None or state["status"] != "full":
                await self.send_json({"type": "INFO", "payload": {"detail": "Waiting for second player"}})
                return

            # FULL ise: oyun başlat + bet lock (idempotent)
            started = await self.db_start_game_if_ready()
            await self.send_json({"type": "SNAPSHOT", "payload": started["snapshot"]})

            # herkes görsün diye event bas
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "room.event",
                    "payload": {
                        "event": "GAME_STARTED",
                        "turn": started["snapshot"].get("turn"),
                        "turn_count": started["snapshot"].get("turn_count"),
                    },
                },
            )

        except Exception as e:
            logger.exception("RoomConsumer.connect failed")
            try:
                await self.send_json({"type": "ERROR", "payload": {"detail": f"{type(e).__name__}: {str(e)}"}})
            except Exception:
                pass
            await self.close(code=1011)

    async def disconnect(self, close_code):
        try:
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
        except Exception:
            pass

    async def receive_json(self, content, **kwargs):
        msg_type = content.get("type")

        if msg_type != "GUESS":
            await self.send_json({"type": "ERROR", "payload": {"detail": "Unknown message type"}})
            return

        payload = content.get("payload") or {}
        try:
            value = int(payload.get("value"))
        except Exception:
            await self.send_json({"type": "ERROR", "payload": {"detail": "Invalid guess value"}})
            return

        await self.handle_guess(value)

    async def handle_guess(self, value: int):
        user = self.scope.get("user")
        if not user or not getattr(user, "is_authenticated", False):
            await self.send_json({"type": "ERROR", "payload": {"detail": "Authentication required"}})
            return

        # Güncel state al
        state = await self.db_get_room_state()
        if state is None:
            await self.send_json({"type": "ERROR", "payload": {"detail": "Room not found"}})
            return

        if state["status"] == "finished":
            await self.send_json({"type": "ERROR", "payload": {"detail": "Game already finished"}})
            return

        # 2. oyuncu yoksa guess YASAK
        if state["player2_id"] is None or state["status"] != "full":
            await self.send_json({"type": "ERROR", "payload": {"detail": "Waiting for second player"}})
            return

        # FULL ise oyun startı garanti et (idempotent)
        state = await self.db_start_game_if_ready()

        if state["current_turn_id"] != user.id:
            await self.send_json({"type": "ERROR", "payload": {"detail": "Not your turn"}})
            return

        # doğru tahmin -> finish
        if value == state["secret_number"]:
            end_state = await self.db_finish_room_and_payout(winner_user_id=user.id)

            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "room.event",
                    "payload": {
                        "event": "GAME_OVER",
                        "winner": end_state["winner_username"],
                        "number": value,
                        "turn_count": end_state["turn_count"],
                        "finished_at": end_state["finished_at"],
                    },
                },
            )
            return

        hint = "higher" if value < state["secret_number"] else "lower"
        next_state = await self.db_switch_turn_and_increment()

        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "room.event",
                "payload": {
                    "event": "GUESS",
                    "by": user.username,
                    "value": value,
                    "result": hint,
                    "next_turn": next_state["current_turn_username"],
                    "turn_count": next_state["turn_count"],
                },
            },
        )

    async def room_event(self, event):
        await self.send_json({"type": "GAME_EVENT", "payload": event["payload"]})

    # ---------------- DB layer ----------------

    @database_sync_to_async
    def db_get_room_state(self):
        try:
            room = Room.objects.select_related("player1", "player2", "current_turn", "winner").get(id=self.room_id)
        except Room.DoesNotExist:
            return None
        return self._state_from_room(room)

    @database_sync_to_async
    def db_start_game_if_ready(self):
        """
        SADECE: player2 varsa ve status FULL ise
        - secret_number üret
        - current_turn yazı-tura
        - bet lock + transaction
        - started_at set
        Bu fonksiyon idempotent: bir kez çalışır.
        """
        with transaction.atomic():
            room = (
                Room.objects.select_for_update()
                .select_related("player1", "player2", "current_turn", "winner")
                .get(id=self.room_id)
            )

            # güvenlik: player2 yokken ASLA başlatma
            if room.player2_id is None:
                return self._state_from_room(room)

            # FULL değilse full'a çek (join sonrası bazen gecikebilir)
            if room.status not in (Room.Status.FULL, Room.Status.FINISHED):
                room.status = Room.Status.FULL
                room.save(update_fields=["status"])

            # zaten kilitlendiyse sadece state dön
            if room.is_locked:
                room.refresh_from_db()
                return self._state_from_room(room)

            # init secret
            if room.secret_number is None:
                room.secret_number = random.randint(1, 100)

            # init turn (yazı-tura)
            if room.current_turn_id is None:
                room.current_turn_id = random.choice([room.player1_id, room.player2_id])

            room.turn_count = room.turn_count or 0

            # bet lock
            bet = int(room.bet_amount)
            p1 = User.objects.select_for_update().get(id=room.player1_id)
            p2 = User.objects.select_for_update().get(id=room.player2_id)

            if p1.balance < bet or p2.balance < bet:
                raise ValueError("Insufficient balance to lock bet")

            p1.balance -= bet
            p2.balance -= bet
            p1.save(update_fields=["balance"])
            p2.save(update_fields=["balance"])

            AccountTransaction.objects.create(
                user=p1,
                room=room,
                type=AccountTransaction.Type.BET_LOCK,
                amount=-bet,
                balance_after=p1.balance,
                note=f"Bet lock for room {room.id}",
            )
            AccountTransaction.objects.create(
                user=p2,
                room=room,
                type=AccountTransaction.Type.BET_LOCK,
                amount=-bet,
                balance_after=p2.balance,
                note=f"Bet lock for room {room.id}",
            )

            room.is_locked = True
            room.started_at = room.started_at or timezone.now()

            room.save(
                update_fields=[
                    "status",
                    "secret_number",
                    "current_turn",
                    "turn_count",
                    "is_locked",
                    "started_at",
                ]
            )

            room.refresh_from_db()
            return self._state_from_room(room)

    @database_sync_to_async
    def db_switch_turn_and_increment(self):
        with transaction.atomic():
            room = (
                Room.objects.select_for_update()
                .select_related("player1", "player2", "current_turn")
                .get(id=self.room_id)
            )

            room.turn_count = (room.turn_count or 0) + 1
            room.current_turn_id = room.player2_id if room.current_turn_id == room.player1_id else room.player1_id
            room.save(update_fields=["current_turn", "turn_count"])
            room.refresh_from_db()

            return {
                "current_turn_id": room.current_turn_id,
                "current_turn_username": room.current_turn.username if room.current_turn else None,
                "turn_count": room.turn_count,
            }

    @database_sync_to_async
    def db_finish_room_and_payout(self, winner_user_id: int):
        with transaction.atomic():
            room = (
                Room.objects.select_for_update()
                .select_related("winner", "player1", "player2")
                .get(id=self.room_id)
            )

            if room.status == Room.Status.FINISHED:
                return {
                    "winner_username": room.winner.username if room.winner else None,
                    "turn_count": room.turn_count,
                    "finished_at": room.finished_at.isoformat() if room.finished_at else None,
                }

            bet = int(room.bet_amount)
            payout = 2 * bet

            room.status = Room.Status.FINISHED
            room.winner_id = winner_user_id
            room.finished_at = timezone.now()
            room.save(update_fields=["status", "winner", "finished_at"])

            winner = User.objects.select_for_update().get(id=winner_user_id)
            winner.balance += payout
            winner.save(update_fields=["balance"])

            AccountTransaction.objects.create(
                user=winner,
                room=room,
                type=AccountTransaction.Type.PAYOUT,
                amount=payout,
                balance_after=winner.balance,
                note=f"Payout for room {room.id}",
            )

            return {
                "winner_username": room.winner.username if room.winner else None,
                "turn_count": room.turn_count,
                "finished_at": room.finished_at.isoformat() if room.finished_at else None,
            }

    def _state_from_room(self, room: Room):
        status_str = str(room.status).lower()

        snapshot = {
            "room": room.id,
            "status": status_str,
            "bet_amount": room.bet_amount,
            "players": [
                room.player1.username if room.player1 else None,
                room.player2.username if room.player2 else None,
            ],
            "turn": room.current_turn.username if room.current_turn else None,
            "winner": room.winner.username if room.winner else None,
            "finished_at": room.finished_at.isoformat() if room.finished_at else None,
            "turn_count": room.turn_count,
        }

        return {
            "player1_id": room.player1_id,
            "player2_id": room.player2_id,
            "status": status_str,
            "secret_number": room.secret_number,        # frontend'e göstermiyorsun zaten, WS iç state
            "current_turn_id": room.current_turn_id,
            "snapshot": snapshot,
        }
