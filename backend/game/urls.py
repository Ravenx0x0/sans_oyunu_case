from django.urls import path
from .views import (
    RoomListCreateView,
    RoomJoinView,
    MeView,
    TransactionListView,
    LeaderboardView,
)

urlpatterns = [
    path("me/", MeView.as_view()),
    path("transactions/", TransactionListView.as_view()),
    path("leaderboard/", LeaderboardView.as_view()),

    path("rooms/", RoomListCreateView.as_view()),
    path("rooms/<int:room_id>/join/", RoomJoinView.as_view()),
]
