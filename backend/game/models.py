from django.conf import settings
from django.db import models


class BetSettings(models.Model):
    min_bet = models.PositiveIntegerField(default=10)
    max_bet = models.PositiveIntegerField(default=1000)
    step = models.PositiveIntegerField(default=10)

    def __str__(self):
        return f"BetSettings(min={self.min_bet}, max={self.max_bet}, step={self.step})"


class Room(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        FULL = "full", "Full"
        FINISHED = "finished", "Finished"

    bet_amount = models.PositiveIntegerField()

    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.OPEN,
        db_index=True,
    )

    player1 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="rooms_created",
        on_delete=models.CASCADE,
    )

    player2 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="rooms_joined",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )

    # Oyun state
    secret_number = models.PositiveSmallIntegerField(null=True, blank=True)

    current_turn = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="rooms_current_turn",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )

    winner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="rooms_won",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )

    # Akış
    is_locked = models.BooleanField(default=False, db_index=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    turn_count = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def player_count(self) -> int:
        return 1 + (1 if self.player2_id else 0)

    @property
    def duration_seconds(self):
        if self.started_at and self.finished_at:
            return int((self.finished_at - self.started_at).total_seconds())
        return None

    def __str__(self):
        return f"Room(id={self.id}, bet={self.bet_amount}, status={self.status})"

    class Meta:
        ordering = ["-id"]


class AccountTransaction(models.Model):
    class Type(models.TextChoices):
        BET_LOCK = "bet_lock", "Bet lock"
        PAYOUT = "payout", "Payout"
        ADJUST = "adjust", "Adjust"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="transactions",
        db_index=True,
    )

    room = models.ForeignKey(
        Room,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="transactions",
        db_index=True,
    )

    type = models.CharField(max_length=20, choices=Type.choices, db_index=True)
    amount = models.IntegerField()
    balance_after = models.IntegerField()

    note = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    def __str__(self):
        return f"Txn(user={self.user_id}, type={self.type}, amount={self.amount}, after={self.balance_after})"

    class Meta:
        ordering = ["-id"]
