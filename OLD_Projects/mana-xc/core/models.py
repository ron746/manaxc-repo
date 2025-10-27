# File: mana-xc/core/models.py

from django.db import models

# Define minimal models necessary for foreign key constraints and core rules

class Athlete(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    # ... other Athlete fields

class Course(models.Model):
    name = models.CharField(max_length=255, unique=True)
    # ...

class Race(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    # CRITICAL: Default Rating Factor (Test A.3 Requirement)
    xc_time_rating = models.DecimalField(max_digits=5, decimal_places=3, default=1.000) 
    # ...

class Result(models.Model):
    athlete = models.ForeignKey(Athlete, on_delete=models.CASCADE)
    race = models.ForeignKey(Race, on_delete=models.CASCADE)
    # CRITICAL: CENTISECONDS Rule Adherence
    time_cs = models.IntegerField() # Must be an Integer, not Float.
    # ...