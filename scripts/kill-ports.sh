#!/bin/bash

echo "Stopping all development servers..."

# Kill Next.js processes
pkill -f "next dev" 2>/dev/null || true

# Kill tsx watch processes  
pkill -f "tsx watch" 2>/dev/null || true

# Kill processes on specific ports
for port in 3000 3001 4000; do
    pid=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        echo "Killing process on port $port (PID: $pid)"
        kill -9 $pid 2>/dev/null || true
    fi
done

echo "All ports cleared!"
