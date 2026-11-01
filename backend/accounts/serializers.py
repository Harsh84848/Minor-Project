from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Workspace

User = get_user_model()

class WorkspaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workspace
        fields = ['id', 'name']

class UserSerializer(serializers.ModelSerializer):
    workspace = WorkspaceSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'workspace']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    workspace_name = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['email', 'username', 'password', 'first_name', 'last_name', 'workspace_name']
        extra_kwargs = {
            'username': {'required': False, 'allow_blank': True},
        }

    def validate_email(self, value):
        normalized = value.strip().lower()
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return normalized

    def validate(self, attrs):
        if not attrs.get('username'):
            attrs['username'] = attrs.get('email', '')
        return attrs

    def create(self, validated_data):
        raw_workspace = validated_data.pop('workspace_name', None) or 'Default Workspace'
        workspace_name = raw_workspace.strip() or 'Default Workspace'
        workspace, created = Workspace.objects.get_or_create(name=workspace_name)

        email = validated_data['email'].strip().lower()
        username = validated_data.get('username') or email

        user = User.objects.create_user(
            username=username,
            email=email,
            password=validated_data['password'],
            first_name=validated_data.get('first_name', '').strip(),
            last_name=validated_data.get('last_name', '').strip(),
            workspace=workspace
        )

        # Seed starter KB for brand-new workspaces so the AI demo works immediately
        if created or not workspace.articles.exists():
            from support.management.commands.seed_demo import DEMO_ARTICLES
            from support.models import KnowledgeArticle

            for item in DEMO_ARTICLES:
                KnowledgeArticle.objects.get_or_create(
                    workspace=workspace,
                    title=item['title'],
                    defaults={
                        'content': item['content'],
                        'source_type': item['source_type'],
                        'status': 'processed',
                        'size_label': item.get('size_label', ''),
                        'pages': item.get('pages'),
                        'source_url': item.get('source_url', ''),
                    },
                )

        # Trigger welcome email via Google Apps Script email relay
        try:
            from core.email_service import send_welcome_email
            send_welcome_email(user.email, user.first_name, workspace.name)
        except Exception:
            pass

        return user
