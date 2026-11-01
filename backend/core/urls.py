# from django.contrib import admin
# from django.urls import path, include

# urlpatterns = [
#     path('admin/', admin.site.urls),
#     path('api/auth/', include('accounts.urls')),
#     path('api/support/', include('support.urls')),
# ]


from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def home(request):
    return JsonResponse({
        "name": "SupportRoot AI",
        "message": "Backend is running successfully.",
        "endpoints": {
            "admin": "/admin/",
            "auth": "/api/auth/",
            "support": "/api/support/",
        },
    })


from support.views import DashboardView, AnalyticsView

urlpatterns = [
    path("", home, name="home"),
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/support/", include("support.urls")),
    path("api/dashboard/", DashboardView.as_view(), name="core_dashboard"),
    path("api/analytics/", AnalyticsView.as_view(), name="core_analytics"),
]
