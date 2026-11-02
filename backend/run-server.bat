@echo off
REM Start the Meta Glass Academics demo server (Django + JSON database).
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo Creating project environment in backend\.venv ...
  python -m venv .venv
  .\.venv\Scripts\python -m pip install -r requirements.txt
)
echo.
echo  Open http://127.0.0.1:8000/ in your browser, then sign in.
echo  (API lives under http://127.0.0.1:8000/api/)
echo  Demo: student1 / parent1 / teacher1  (password: pass123)
echo.
.\.venv\Scripts\python manage.py runserver 127.0.0.1:8000
