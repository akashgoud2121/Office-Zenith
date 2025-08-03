
from django.http import HttpResponse
from django.shortcuts import render
from .models import Reminder
from django.shortcuts import redirect, get_object_or_404
from .models import Reminder
from .models import ReminderLog
from django.contrib import messages

def home(request):
    return render(request,"home.html")
# Create your views here.
def dashboard(request):
    reminders = Reminder.objects.filter(is_active=True)
    return render(request, 'dashboard.html', {'reminders': reminders})

from django.contrib import messages

def toggle_reminder(request, reminder_id):
    reminder = get_object_or_404(Reminder, id=reminder_id)
    reminder.is_active = not reminder.is_active
    reminder.save()
    state = 'activated' if reminder.is_active else 'deactivated'
    messages.success(request, f"Reminder '{reminder.title}' has been {state}.")
    return redirect('dashboard')

def log_activity(request, reminder_id):
    reminder = get_object_or_404(Reminder, id=reminder_id)
    ReminderLog.objects.create(reminder=reminder)
    messages.success(request, f"Activity for '{reminder.title}' logged.")
    return redirect('dashboard')


def view_logs(request):
    logs = ReminderLog.objects.select_related('reminder').order_by('-logged_at')
    return render(request, 'logs.html', {'logs': logs})
