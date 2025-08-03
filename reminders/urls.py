from django.urls import path
from . import views

urlpatterns = [
    path('', views.dashboard, name='dashboard'),
    path('toggle/<int:reminder_id>/', views.toggle_reminder, name='toggle_reminder'),
    path('log/<int:reminder_id>/', views.log_activity, name='log_activity'),  # <-- This line is essential
    path('logs/', views.view_logs, name='view_logs'),
]
