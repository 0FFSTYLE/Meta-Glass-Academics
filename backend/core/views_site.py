"""Serve the static website/ portals from Django so one URL runs everything.

""            -> website/main/index.html      (landing)
"main/..."    -> website/main/...             (landing + login)
"student/"    -> website/student/index.html   (portal shells)
"parent/" / "teacher/" / "shared/" likewise.
"""
import mimetypes
from pathlib import Path

from django.conf import settings
from django.http import FileResponse, HttpResponseNotFound, HttpResponseRedirect

mimetypes.add_type("text/css", ".css")
mimetypes.add_type("text/javascript", ".js")

WEB_ROOT = Path(settings.BASE_DIR).parent / "website"


def site(req, res=""):
    if not res:
        # Redirect (not serve) so main/index.html's relative
        # asset links (main.css, login.html) resolve under /main/.
        return HttpResponseRedirect("/main/")
    target = (WEB_ROOT / res).resolve()
    try:
        target.relative_to(WEB_ROOT.resolve())
    except ValueError:
        return HttpResponseNotFound("Not found")
    if target.is_dir():
        target = target / "index.html"
    if not target.is_file():
        return HttpResponseNotFound("Not found")
    mime, _ = mimetypes.guess_type(str(target))
    return FileResponse(open(target, "rb"), content_type=mime or "application/octet-stream")
