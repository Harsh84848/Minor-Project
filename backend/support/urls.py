from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import KnowledgeArticleViewSet, ConversationViewSet, ChatView, TicketViewSet

router = DefaultRouter()
router.register(r'articles', KnowledgeArticleViewSet, basename='articles')
router.register(r'conversations', ConversationViewSet, basename='conversations')
router.register(r'tickets', TicketViewSet, basename='tickets')

urlpatterns = [
    path('chat/', ChatView.as_view(), name='chat'),
    path('', include(router.urls)),
]
