import random
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from .serializers import RegisterSerializer, UserSerializer
from django.contrib.auth import get_user_model
from core.email_service import send_password_reset_email

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

class UserDetailView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class ForgotPasswordView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        if not email:
            return Response(
                {"detail": "Please provide a valid email address."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.filter(email__iexact=email).first()
        # Generate 6-digit verification code
        reset_code = f"{random.randint(100000, 999999)}"

        if user:
            send_password_reset_email(user.email, reset_code)
        else:
            # Send even if user not found for testing / privacy
            send_password_reset_email(email, reset_code)

        return Response({
            "detail": "Password reset code sent to your email.",
            "email": email,
        })

