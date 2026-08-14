#!/bin/bash

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
SERVER_DIR="$ROOT_DIR/server"
LOG_DIR="${COZE_LOG_DIR:-$ROOT_DIR/logs}"
LOG_SERVER_FILE="$LOG_DIR/server.log"
SERVER_PORT="${SERVER_PORT:-9091}"

mkdir -p "$LOG_DIR"

pipe_to_log() {
  local source="${1:-SERVER}"
  local raw_log="${2:-}"
  local line clean_line timestamp
  while IFS= read -r line || [ -n "$line" ]; do
    clean_line=$(printf '%s' "$line" | sed 's/\x1b\[[0-9;]*[mA-Za-z]//g')
    if [ -n "$raw_log" ]; then
      timestamp=$(date '+%Y-%m-%d %H:%M:%S')
      echo "[$timestamp] $clean_line" >> "$raw_log"
    fi
    printf '[%s] %s\n' "$source" "$clean_line"
  done
}

kill_old_server() {
  if command -v lsof &> /dev/null; then
    local pids
    pids=$(lsof -t -i tcp:"$SERVER_PORT" -sTCP:LISTEN 2>/dev/null || true)
    if [ -n "$pids" ]; then
      echo "正在关闭旧的 server 进程：$pids"
      kill -9 $pids 2>/dev/null || echo "关闭进程失败：$pids"
      sleep 1
    fi
  fi
}

echo "==================== Server Dev Run ===================="
echo "Server 目录：$SERVER_DIR"
echo "Server 端口：$SERVER_PORT"
echo "日志文件：$LOG_SERVER_FILE"

kill_old_server

echo "启动 server 服务..."
cd "$SERVER_DIR"
NODE_ENV=development PORT="$SERVER_PORT" npx tsx watch ./src/index.ts 2>&1 | pipe_to_log "SERVER" "$LOG_SERVER_FILE"
