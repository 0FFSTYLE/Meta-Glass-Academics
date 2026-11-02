/* Glass Camera — external webcam stand-in for Meta Glasses.
 * Captures snapshots via getUserMedia, sends frames to the Django
 * processing layer (the "phone" in the flowchart), shows focus feedback.
 * Swap startGlassStream() with the Meta Glasses SDK when hardware arrives;
 * the upload/process contract stays identical. */
const GlassCam = {
  stream: null,
  timer: null,
  sessionId: null,
  videoEl: null,

  async start(videoEl, { studentId, subject = "", onCapture = null, everyMs = 15000 } = {}) {
    this.videoEl = videoEl;
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Camera API not available — use Chrome/Edge over localhost or HTTPS.");
    }
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, facingMode: "environment" }, audio: false,
    });
    videoEl.srcObject = this.stream;
    await videoEl.play().catch(() => {});
    const { session } = await api("/glass/session/start/", {
      method: "POST", body: { student_id: studentId },
    });
    this.sessionId = session.id;
    this.subject = subject;
    // First snapshot right away, then on interval.
    this.snap(studentId, onCapture);
    this.timer = setInterval(() => this.snap(studentId, onCapture), everyMs);
    return this.sessionId;
  },

  frame(videoEl = this.videoEl, maxW = 640) {
    const c = document.createElement("canvas");
    const scale = Math.min(1, maxW / (videoEl.videoWidth || 640));
    c.width = Math.round((videoEl.videoWidth || 640) * scale);
    c.height = Math.round((videoEl.videoHeight || 480) * scale);
    c.getContext("2d").drawImage(videoEl, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.7);
  },

  async snap(studentId, onCapture) {
    if (!this.stream || !this.videoEl?.videoWidth) return;
    try {
      const data = await api("/glass/capture/", {
        method: "POST",
        body: { student_id: studentId, session_id: this.sessionId, image: this.frame() },
      });
      onCapture?.(data);
    } catch (e) { console.warn("capture upload failed:", e.message); }
  },

  async stop({ subject = "", topic = "" } = {}) {
    clearInterval(this.timer);
    this.timer = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (this.videoEl) this.videoEl.srcObject = null;
    if (!this.sessionId) return null;
    const data = await api("/glass/session/stop/", {
      method: "POST",
      body: { session_id: this.sessionId, subject: subject || this.subject || "", topic },
    });
    this.sessionId = null;
    return data.session;
  },
};
