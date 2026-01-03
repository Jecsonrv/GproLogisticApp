from django.urls import path
from .views import DashboardView
from .views_alerts import AlertsView

urlpatterns = [
    path('', DashboardView.as_view(), name='dashboard-stats'),
    path('alerts/', AlertsView.as_view(), name='dashboard-alerts'),
]
