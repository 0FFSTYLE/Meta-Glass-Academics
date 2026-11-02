from django.urls import include, path

from core import views_site

urlpatterns = [
    path("api/", include("core.urls")),
    path("", views_site.site, {"res": ""}),
    path("<path:res>", views_site.site),
]
