import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "demo-insecure-key-change-me")
DEBUG = os.environ.get("DJANGO_DEBUG", "1") == "1"
ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.staticfiles",
    "core",
]

MIDDLEWARE = [
    "django.middleware.common.CommonMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

# JSON files are the demo database; sqlite exists only to satisfy Django checks.
DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / "db.sqlite3"}}

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_TZ = True
STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

JSON_DB_DIR = BASE_DIR / "database"
# Meta (Llama) API for ASK — set META_API_KEY to go live, else offline fallback.
META_API_KEY = os.environ.get("META_API_KEY", "")
META_API_URL = os.environ.get("META_API_URL", "https://api.llama.com/v1/chat/completions")
META_MODEL = os.environ.get("META_MODEL", "Llama-4-Maverick-17B-128E-Instruct-FP8")
SAVE_SNAPSHOTS = os.environ.get("SAVE_SNAPSHOTS", "0") == "1"
SNAPSHOT_DIR = BASE_DIR / "database" / "snapshots"
