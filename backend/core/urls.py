from django.contrib import admin
from django.urls import path

from game.views import (
    ApiLoginView,
    MeView,
    RoomListCreateView,
    RoomJoinView,
    TransactionListView,
    LeaderboardView,
    lobby_view,
    play_room_view,
)

urlpatterns = [
    path("admin/", admin.site.urls),

    # UI (Django template)
    path("", lobby_view, name="lobby"),
    path("play/<int:room_id>/", play_room_view, name="play-room"),

    # API
    path("api/auth/login/", ApiLoginView.as_view(), name="api-login"),
    path("api/me/", MeView.as_view(), name="api-me"),
    path("api/rooms/", RoomListCreateView.as_view(), name="api-rooms"),
    path("api/rooms/<int:room_id>/join/", RoomJoinView.as_view(), name="api-room-join"),
    path("api/transactions/", TransactionListView.as_view(), name="api-transactions"),
    path("api/leaderboard/", LeaderboardView.as_view(), name="api-leaderboard"),
]
