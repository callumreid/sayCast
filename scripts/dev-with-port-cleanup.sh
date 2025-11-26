#!/usr/bin/env bash
set -euo pipefail

HUD_PORT="${SAYCAST_HUD_PORT:-48123}"
STARTUP_CMD="pnpm run start:saycast"
CHILD_PID=""

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

print_warning() {
    echo "⚠️  $1"
}

print_info() {
    echo "ℹ️  $1"
}

print_success() {
    echo "✅ $1"
}

kill_port_processes() {
    local port=$1
    if ! command_exists lsof; then
        print_warning "lsof not found, skipping port cleanup"
        return 0
    fi

    local attempts=0
    local max_attempts=10
    
    while (( attempts < max_attempts )); do
        local pids
        pids=$(lsof -ti:"$port" 2>/dev/null || true)
        
        if [[ -z "$pids" ]]; then
            if (( attempts > 0 )); then
                print_success "Port $port cleared after $attempts attempt(s)"
            fi
            return 0
        fi
        
        (( attempts++ ))
        print_warning "Attempt $attempts/$max_attempts: Killing processes on port $port (PIDs: ${pids//$'\n'/, })"
        echo "$pids" | xargs kill -9 2>/dev/null || true
        sleep 0.5
    done

    local remaining
    remaining=$(lsof -ti:"$port" 2>/dev/null || true)
    if [[ -n "$remaining" ]]; then
        print_warning "Could not clear port $port after $max_attempts attempts"
        return 1
    fi
    return 0
}

kill_stale_electron() {
    if ! command_exists pgrep; then
        return 0
    fi

    local electron_pids
    electron_pids=$(pgrep -f "electron.*saycast-hud" 2>/dev/null || true)
    
    if [[ -n "$electron_pids" ]]; then
        print_warning "Found stale Electron HUD processes, killing..."
        echo "$electron_pids" | xargs kill -9 2>/dev/null || true
        sleep 0.3
    fi
    
    electron_pids=$(pgrep -f "Electron.*saycast-hud" 2>/dev/null || true)
    if [[ -n "$electron_pids" ]]; then
        echo "$electron_pids" | xargs kill -9 2>/dev/null || true
        sleep 0.3
    fi
}

kill_stale_core() {
    if ! command_exists pgrep; then
        return 0
    fi

    local node_pids
    node_pids=$(pgrep -f "node.*apps/core" 2>/dev/null || true)
    
    if [[ -n "$node_pids" ]]; then
        print_warning "Found stale core-service processes, killing..."
        echo "$node_pids" | xargs kill -9 2>/dev/null || true
        sleep 0.3
    fi
}

cleanup() {
    print_info "Shutting down..."
    
    if [[ -n "$CHILD_PID" ]] && kill -0 "$CHILD_PID" 2>/dev/null; then
        kill -TERM "$CHILD_PID" 2>/dev/null || true
        
        local wait_count=0
        while kill -0 "$CHILD_PID" 2>/dev/null && (( wait_count < 10 )); do
            sleep 0.2
            (( wait_count++ ))
        done
        
        if kill -0 "$CHILD_PID" 2>/dev/null; then
            print_warning "Child process didn't exit gracefully, force killing..."
            kill -9 "$CHILD_PID" 2>/dev/null || true
        fi
    fi
    
    kill_stale_electron
    kill_port_processes "$HUD_PORT" || true
    
    print_success "Cleanup complete"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

print_info "=== SayCast Development Startup ==="
print_info "Cleaning up stale processes..."

kill_stale_electron
kill_stale_core
kill_port_processes "$HUD_PORT" || true

print_info "Starting development servers..."

$STARTUP_CMD &
CHILD_PID=$!

wait "$CHILD_PID" 2>/dev/null || true
