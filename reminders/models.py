from django.db import models
from django.utils import timezone
# Create your models here.
from django.db import models
from decimal import Decimal

class Reminder(models.Model):
    title = models.CharField(max_length=100)
    description = models.TextField()
    timer = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('30.00'))
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title
    
class ReminderLog(models.Model):
    reminder = models.ForeignKey(Reminder, on_delete=models.CASCADE)
    logged_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.reminder.title} at {self.logged_at.strftime('%Y-%m-%d %H:%M:%S')}"