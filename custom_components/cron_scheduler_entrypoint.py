"""
Langflow Cron Scheduler — file-based autodiscovery.

Runs inside the Langflow container alongside the main process.
Watches /tmp/langflow_crons/ for registration files written by
the Cron Scheduler component. Each file = one flow to trigger.

Env vars:
    CRON_API_KEY       — required, Langflow API key
    CRON_API_URL       — optional, default http://localhost:7860
    CRON_ENABLED       — optional, "true" (default) or "false"
    CRON_SCAN_INTERVAL — optional, how often to re-scan registrations (default 30s)
"""

import json
import logging
import os
import signal
import sys
import threading
import time

import requests

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
API_URL = os.environ.get("CRON_API_URL", "http://localhost:7860").rstrip("/")
API_KEY = os.environ.get("CRON_API_KEY", "")
SCAN_INTERVAL = int(os.environ.get("CRON_SCAN_INTERVAL", "30"))
CRON_DIR = "/app/langflow/cron_registrations"

logging.basicConfig(
    level=logging.INFO,
    format="[cron] %(asctime)s %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("cron")

_shutdown = threading.Event()


def _signal_handler(_sig, _frame):
    log.info("Shutting down...")
    _shutdown.set()


signal.signal(signal.SIGTERM, _signal_handler)
signal.signal(signal.SIGINT, _signal_handler)

# ---------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------
_session = requests.Session()
_session.headers.update({"x-api-key": API_KEY, "Content-Type": "application/json"})


def _wait_for_langflow():
    log.info("Waiting for Langflow at %s ...", API_URL)
    while not _shutdown.is_set():
        try:
            r = _session.get(f"{API_URL}/health", timeout=5)
            if r.status_code == 200:
                log.info("Langflow is ready")
                return True
        except requests.ConnectionError:
            pass
        _shutdown.wait(5)
    return False


def _trigger_flow(flow_id):
    try:
        r = _session.post(
            f"{API_URL}/api/v1/run/{flow_id}",
            json={"input_value": ""},
            timeout=120,
        )
        if r.status_code == 200:
            log.info("OK   %s", flow_id[:12])
        else:
            log.warning("FAIL %s HTTP %s", flow_id[:12], r.status_code)
    except Exception as e:
        log.warning("ERR  %s %s", flow_id[:12], e)


# ---------------------------------------------------------------------------
# Discovery — reads /tmp/langflow_crons/*.json
# ---------------------------------------------------------------------------
def _discover():
    if not os.path.isdir(CRON_DIR):
        return {}

    found = {}
    for fname in os.listdir(CRON_DIR):
        if not fname.endswith(".json"):
            continue
        path = os.path.join(CRON_DIR, fname)
        try:
            with open(path, "r") as f:
                data = json.load(f)
            flow_id = data["flow_id"]
            interval = max(int(data.get("interval", 60)), 5)
            found[flow_id] = interval
        except (json.JSONDecodeError, KeyError, ValueError):
            log.warning("Bad registration file: %s", fname)
    return found


# ---------------------------------------------------------------------------
# Per-flow loop
# ---------------------------------------------------------------------------
_active = {}   # flow_id -> threading.Event
_intervals = {}  # flow_id -> int


def _flow_loop(flow_id, interval, stop_event):
    log.info("START %s every %ds", flow_id[:12], interval)
    while not stop_event.is_set() and not _shutdown.is_set():
        stop_event.wait(interval)
        if stop_event.is_set() or _shutdown.is_set():
            break
        _trigger_flow(flow_id)
    log.info("STOP  %s", flow_id[:12])


def _start_flow(flow_id, interval):
    stop_evt = threading.Event()
    _active[flow_id] = stop_evt
    _intervals[flow_id] = interval
    t = threading.Thread(target=_flow_loop, args=(flow_id, interval, stop_evt), daemon=True)
    t.start()


def _stop_flow(flow_id):
    _active[flow_id].set()
    del _active[flow_id]
    _intervals.pop(flow_id, None)


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------
def main():
    if not API_KEY:
        log.error("CRON_API_KEY is required")
        sys.exit(1)

    if not _wait_for_langflow():
        return

    log.info("Watching %s for registrations (scan every %ds)", CRON_DIR, SCAN_INTERVAL)

    while not _shutdown.is_set():
        discovered = _discover()

        # Start new or restart if interval changed
        for flow_id, interval in discovered.items():
            if flow_id not in _active:
                _start_flow(flow_id, interval)
            elif _intervals.get(flow_id) != interval:
                log.info("Interval changed for %s: %ds -> %ds, restarting", flow_id[:12], _intervals.get(flow_id), interval)
                _stop_flow(flow_id)
                _start_flow(flow_id, interval)

        # Stop removed
        for flow_id in list(_active.keys()):
            if flow_id not in discovered:
                log.info("Unregistered %s, stopping", flow_id[:12])
                _stop_flow(flow_id)

        _shutdown.wait(SCAN_INTERVAL)

    for stop_evt in _active.values():
        stop_evt.set()


if __name__ == "__main__":
    main()
