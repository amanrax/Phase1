#!/bin/bash
# restart_backend.sh - Force backend reload by modifying a file

echo "🔄 Forcing backend reload..."

# Touch main.py to trigger uvicorn's auto-reload
touch /workspaces/Phase1/backend/app/main.py

echo "✅ Backend reload triggered!"
echo ""
echo "Wait 5-10 seconds for uvicorn to reload, then test your login again."
echo ""
echo "Current Codespaces URLs detected:"
echo "  Backend:  https://jubilant-goggles-r5q9pv5j6rjh59rq-8000.app.github.dev"
echo "  Frontend: https://animated-cod-9grvj4gpw77f7xww-5173.app.github.dev"
echo ""
echo "💡 Make sure port 8000 is set to 'Public' in the PORTS tab!"
