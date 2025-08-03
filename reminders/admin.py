from django.contrib import admin
from .models import Reminder,ReminderLog

admin.site.register(Reminder)
admin.site.register(ReminderLog)