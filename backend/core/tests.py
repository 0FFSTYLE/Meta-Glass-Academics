"""Focused regression tests: site serving (root + portals) and API health."""
from django.test import SimpleTestCase


def body(resp):
    return b"".join(resp.streaming_content) if hasattr(resp, "streaming_content") else resp.content


class SiteServingTests(SimpleTestCase):
    def test_root_redirects_to_main(self):
        r = self.client.get("/")
        self.assertEqual(r.status_code, 302)
        self.assertEqual(r["Location"], "/main/")

    def test_main_landing_and_css(self):
        r = self.client.get("/main/")
        self.assertEqual(r.status_code, 200)
        self.assertIn(b"Meta Glass", body(r))
        css = self.client.get("/main/main.css")
        self.assertEqual(css.status_code, 200)
        self.assertIn("text/css", css["Content-Type"])

    def test_portal_routes(self):
        for url in ("/main/login.html", "/student/", "/parent/", "/teacher/"):
            with self.subTest(url=url):
                self.assertEqual(self.client.get(url).status_code, 200)

    def test_shared_module_served_as_js(self):
        r = self.client.get("/shared/api.js")
        self.assertEqual(r.status_code, 200)
        self.assertIn("javascript", r["Content-Type"])

    def test_missing_page_is_404(self):
        self.assertEqual(self.client.get("/no-such-page-xyz").status_code, 404)

    def test_api_still_works(self):
        r = self.client.get("/api/health/")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()["ok"])
