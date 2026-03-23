"""
Cron Scheduler component — registers this flow for periodic execution.

Does NOT manage threads. Writes a registration file to /tmp/langflow_crons/
that the background cron_scheduler.py process picks up automatically.

Just place this component as the first node in any flow.
"""

from langflow.custom import Component
from langflow.io import IntInput, BoolInput, Output
from langflow.schema.message import Message
import json
import os
import time

_CRON_DIR = "/tmp/langflow_crons"


class CronSchedulerNode(Component):
    display_name = "Cron Scheduler"
    description = "Registers this flow for periodic execution. Place as the first node."
    icon = "clock"

    inputs = [
        IntInput(
            name="interval_seconds",
            display_name="Interval (seconds)",
            info="How often to re-trigger this flow.",
            value=60,
        ),
        BoolInput(
            name="enabled",
            display_name="Enabled",
            info="Toggle scheduling on/off.",
            value=True,
        ),
    ]

    outputs = [
        Output(name="trigger", display_name="Trigger", method="run_trigger"),
    ]

    def _register(self):
        os.makedirs(_CRON_DIR, exist_ok=True)
        reg_file = os.path.join(_CRON_DIR, f"{self.flow_id}.json")

        if not self.enabled:
            # Remove registration
            if os.path.exists(reg_file):
                os.remove(reg_file)
                print(f"[CronComponent] Unregistered flow {self.flow_id}")
            return

        data = {
            "flow_id": self.flow_id,
            "interval": max(self.interval_seconds, 5),
            "registered_at": time.time(),
        }
        with open(reg_file, "w") as f:
            json.dump(data, f)
        print(f"[CronComponent] Registered flow {self.flow_id} every {data['interval']}s")

    def initialize(self, **kwargs):
        """Register on component load so cron works even without running the flow."""
        try:
            self._register()
        except Exception:
            pass

    def run_trigger(self) -> Message:
        self._register()
        return Message(text="cron:ok")
