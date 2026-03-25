#!/bin/bash
# Custom entrypoint: starts cron scheduler in background, then launches Langflow.

if [ "${CRON_ENABLED:-true}" = "true" ] && [ -n "${CRON_API_KEY:-}" ]; then
    python /app/cron_scheduler.py &
    echo "[entrypoint] Cron scheduler started in background"
fi

# Start Langflow as PID 1
exec langflow run
