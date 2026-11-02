from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.health),
    path("auth/login/", views.login),
    path("auth/register/", views.register),
    path("student/<str:sid>/overview/", views.student_overview),
    path("student/<str:sid>/previous/", views.student_previous),
    path("graph/compare/", views.compare_graph),
    path("diary/", views.diary),
    path("ask/", views.ask),
    path("glass/session/start/", views.glass_start),
    path("glass/session/stop/", views.glass_stop),
    path("glass/capture/", views.glass_capture),
    path("glass/sessions/", views.glass_sessions),
    path("parent/<str:pid>/overview/", views.parent_overview),
    path("parent/<str:pid>/records/", views.parent_records),
    path("consults/", views.consults),
    path("consults/<str:cid>/reply/", views.consults),
    path("teacher/<str:tid>/overview/", views.teacher_overview),
    path("tests/", views.tests),
    path("notes/", views.notes),
    path("announcements/", views.announcements),
    path("calendar/", views.calendar),
]
