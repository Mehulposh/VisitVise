
const { subscribe } = require("../services/events");
const { hostIdsFor } = require("../services/visits");

const open = new Map(); // userId -> connection count

exports.streamEvents = async (req, res) => {
  const me = String(req.user._id);
  const count = open.get(me) || 0;

  // Maximum 5 concurrent SSE connections per user.
  if (count >= 5) {
    return res.status(429).send({
      error: "Too many open live connections",
    });
  }

  open.set(me, count + 1);

  let off;
  let beat;
  let cleaned = false;

  const staff = ["security", "admin"].includes(req.user.role);

  const site =
    req.user.siteId && req.user.role === "security"
      ? String(req.user.siteId)
      : null;

  try {
    const mine = new Set(
      (await hostIdsFor(req.user)).map(String)
    );

    // The client receives a live Server-Sent Events stream.
    res.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    res.flushHeaders();
    res.write("retry: 5000\n\n");

    off = subscribe((event) => {
      const canReceive =
        (staff && (!site || event.siteId === site)) ||
        mine.has(event.hostId);

      if (canReceive && !res.writableEnded) {
        res.write(
          `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
        );
      }
    });

    // Keep the connection alive.
    beat = setInterval(() => {
      if (!res.writableEnded) {
        res.write(": ping\n\n");
      }
    }, 25000);

    // Clean up when the client disconnects.
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;

      if (beat) clearInterval(beat);
      if (off) off();

      const remaining = (open.get(me) || 1) - 1;

      if (remaining <= 0) {
        open.delete(me);
      } else {
        open.set(me, remaining);
      }
    };

    req.on("close", cleanup);
  } catch (error) {
    if (beat) clearInterval(beat);
    if (off) off();

    const remaining = (open.get(me) || 1) - 1;

    if (remaining <= 0) {
      open.delete(me);
    } else {
      open.set(me, remaining);
    }

    throw error;
  }
};
