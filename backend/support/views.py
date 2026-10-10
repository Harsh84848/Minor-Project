from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .ai import answer_from_knowledge
from .models import KnowledgeArticle, Conversation, Message, Ticket
from .serializers import (
    KnowledgeArticleSerializer,
    ConversationSerializer,
    ChatRequestSerializer,
    TicketSerializer,
    TicketCreateSerializer,
)


def get_workspace(user):
    return getattr(user, 'workspace', None)


class WorkspaceScopedMixin:
    permission_classes = [IsAuthenticated]

    def get_workspace_or_error(self):
        workspace = get_workspace(self.request.user)
        if not workspace:
            return None, Response(
                {'detail': 'No workspace associated with this account.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return workspace, None


class KnowledgeArticleViewSet(WorkspaceScopedMixin, viewsets.ModelViewSet):
    serializer_class = KnowledgeArticleSerializer
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        workspace = get_workspace(self.request.user)
        if not workspace:
            return KnowledgeArticle.objects.none()
        return KnowledgeArticle.objects.filter(workspace=workspace)

    def create(self, request, *args, **kwargs):
        workspace, err = self.get_workspace_or_error()
        if err:
            return err

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        source_type = serializer.validated_data.get('source_type', 'text')
        title = serializer.validated_data.get('title', 'Untitled')
        content = serializer.validated_data.get('content', '')
        size_label = serializer.validated_data.get('size_label') or (
            f'{max(1, len(content) // 1024)} KB' if content else '—'
        )

        # Demo: mark as processing briefly for PDF/website, then processed
        initial_status = 'processing' if source_type in ('pdf', 'website') else 'processed'

        article = KnowledgeArticle.objects.create(
            workspace=workspace,
            title=title,
            content=content,
            source_type=source_type,
            status=initial_status,
            size_label=size_label,
            pages=serializer.validated_data.get('pages'),
            source_url=serializer.validated_data.get('source_url', ''),
        )

        # For demo UX: instantly mark processed if content was provided
        if content and initial_status == 'processing':
            article.status = 'processed'
            article.save(update_fields=['status', 'updated_at'])
        elif initial_status == 'processing' and not content:
            # Website/PDF without body still "processes" with placeholder content
            article.content = (
                f'Content extracted from {title}. '
                'Add more detail in Settings or re-upload with text for better AI answers.'
            )
            article.status = 'processed'
            article.save(update_fields=['content', 'status', 'updated_at'])

        return Response(
            KnowledgeArticleSerializer(article).data,
            status=status.HTTP_201_CREATED,
        )


class ConversationViewSet(WorkspaceScopedMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = ConversationSerializer

    def get_queryset(self):
        workspace = get_workspace(self.request.user)
        if not workspace:
            return Conversation.objects.none()
        return Conversation.objects.filter(workspace=workspace).prefetch_related(
            'messages'
        )

    @action(detail=False, methods=['post'], url_path='start')
    def start(self, request):
        workspace, err = self.get_workspace_or_error()
        if err:
            return err

        name = request.data.get('customer_name') or (
            request.user.first_name or request.user.username or 'You'
        )
        conversation = Conversation.objects.create(
            workspace=workspace,
            customer_name=name,
        )
        Message.objects.create(
            conversation=conversation,
            sender='ai',
            content=(
                "Hello! I'm your Supportroot Ai assistant. I can answer questions "
                "based on your company's knowledge base. How can I help you today?"
            ),
        )
        return Response(
            ConversationSerializer(conversation).data,
            status=status.HTTP_201_CREATED,
        )


class ChatView(WorkspaceScopedMixin, APIView):
    """POST /api/support/chat/ — send a user message, get AI reply from KB."""

    def post(self, request):
        workspace, err = self.get_workspace_or_error()
        if err:
            return err

        serializer = ChatRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        text = serializer.validated_data['message'].strip()
        conversation_id = serializer.validated_data.get('conversation_id')

        if conversation_id:
            conversation = Conversation.objects.filter(
                id=conversation_id, workspace=workspace
            ).first()
            if not conversation:
                return Response(
                    {'detail': 'Conversation not found.'},
                    status=status.HTTP_404_NOT_FOUND,
                )
        else:
            conversation = Conversation.objects.create(
                workspace=workspace,
                customer_name=request.user.first_name
                or request.user.username
                or 'You',
            )
            Message.objects.create(
                conversation=conversation,
                sender='ai',
                content=(
                    "Hello! I'm your Supportroot Ai assistant. I can answer questions "
                    "based on your company's knowledge base. How can I help you today?"
                ),
            )

        Message.objects.create(
            conversation=conversation, sender='user', content=text
        )

        articles = KnowledgeArticle.objects.filter(
            workspace=workspace, status='processed'
        )
        result = answer_from_knowledge(text, articles)

        ai_msg = Message.objects.create(
            conversation=conversation,
            sender='ai',
            content=result['answer'],
            confidence=result['confidence'],
        )

        system_message = None
        if result['confidence'] < 0.5:
            system_message = Message.objects.create(
                conversation=conversation,
                sender='system',
                content=(
                    'AI confidence is low for this query. Consider escalating to a '
                    'human agent or creating a ticket.'
                ),
            )

        conversation.save(update_fields=['updated_at'])

        payload = {
            'conversation_id': conversation.id,
            'user_message': {
                'id': conversation.messages.filter(sender='user').last().id,
                'content': text,
            },
            'ai_message': {
                'id': ai_msg.id,
                'content': ai_msg.content,
                'confidence': ai_msg.confidence,
                'source': result.get('source'),
            },
            'system_message': (
                {
                    'id': system_message.id,
                    'content': system_message.content,
                }
                if system_message
                else None
            ),
        }
        return Response(payload)


class TicketViewSet(WorkspaceScopedMixin, viewsets.ModelViewSet):
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_queryset(self):
        workspace = get_workspace(self.request.user)
        if not workspace:
            return Ticket.objects.none()
        qs = Ticket.objects.filter(workspace=workspace)
        status_filter = self.request.query_params.get('status')
        if status_filter and status_filter != 'all':
            qs = qs.filter(status=status_filter)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(subject__icontains=search) | Q(customer_name__icontains=search)
            )
        return qs

    def get_serializer_class(self):
        if self.action == 'create':
            return TicketCreateSerializer
        return TicketSerializer

    def create(self, request, *args, **kwargs):
        workspace, err = self.get_workspace_or_error()
        if err:
            return err
        serializer = TicketCreateSerializer(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        ticket = serializer.save()
        return Response(
            TicketSerializer(ticket).data, status=status.HTTP_201_CREATED
        )

    def partial_update(self, request, *args, **kwargs):
        ticket = self.get_object()
        allowed = {'status', 'priority', 'assigned_to', 'description'}
        data = {k: v for k, v in request.data.items() if k in allowed}
        for key, value in data.items():
            setattr(ticket, key, value)
        ticket.save()
        return Response(TicketSerializer(ticket).data)
