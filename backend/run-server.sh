#!/usr/bin/env bash
# Start the Meta Glass Academics demo server (Django + JSON database).
cd "$(dirname "$0")"
if [ ! -x ".venv/bin/python" ]; then
  echo "Creating project environment in backend/.venv ..."
  python3 -m venv .venv
  .venv/bin/pip install -r requirements.txt
fi
echo ""
echo " Open http://127.0.0.1:8000/ in your browser, then sign in."
echo " (API lives under http://127.0.0.1:8000/api/)"
echo " Demo: student1 / parent1 / teacher1  (password: pass123)"
echo ""
.venv/bin/python manage.py runserver 127.0.0.1:8000
