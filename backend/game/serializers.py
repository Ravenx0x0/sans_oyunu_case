from rest_framework import serializers
from .models import Room


class RoomSerializer(serializers.ModelSerializer):
    player_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Room
        fields = [
            "id",
            "bet_amount",
            "status",
            "player_count",
            "created_at",
        ]
