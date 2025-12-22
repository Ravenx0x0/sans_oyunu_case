from django.contrib import admin
from .models import BetSettings, Room, AccountTransaction


@admin.register(BetSettings)
class BetSettingsAdmin(admin.ModelAdmin):
    list_display = ("id", "min_bet", "max_bet", "step")
    search_fields = ("id",)


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "status",
        "bet_amount",
        "player1",
        "player2",
        "is_locked",
        "turn_count",
        "started_at",
        "finished_at",
        "winner",
        "created_at",
    )
    list_filter = ("status", "is_locked")
    search_fields = ("id", "player1__username", "player2__username", "winner__username")
    ordering = ("-id",)


@admin.register(AccountTransaction)
class AccountTransactionAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "type", "amount", "balance_after", "room", "created_at")
    list_filter = ("type",)
    search_fields = ("user__username", "room__id")
    ordering = ("-id",)
