from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    date_of_birth = serializers.DateField()

    class Meta:
        model = User
        fields = ["username", "email", "password", "date_of_birth"]

    def create(self, validated_data):
        user = User(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            date_of_birth=validated_data["date_of_birth"],
            balance=1000,
            role=User.Role.USER,
        )
        user.set_password(validated_data["password"])
        user.save()
        return user

class MeSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "role", "balance"]
