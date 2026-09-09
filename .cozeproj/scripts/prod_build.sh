#!/bin/bash
if [ -z "${BASH_VERSION:-}" ]; then exec /usr/bin/env bash "$0" "$@"; fi
set -euo pipefail
ROOT_DIR="$(pwd)"

# ==================== 工具函数 ====================
info() {
  echo "[INFO] $1"
}
warn() {
  echo "[WARN] $1"
}
error() {
  echo "[ERROR] $1"
  exit 1
}
check_command() {
  if ! command -v "$1" &> /dev/null; then
    error "命令 $1 未找到，请先安装"
  fi
}

info "==================== 开始构建 ===================="
info "开始执行构建脚本（build_prod.sh）..."
info "正在检查依赖命令是否存在..."
# 检查核心命令
check_command "pnpm"
check_command "npm"

# ==================== 安装 Node 依赖 ====================
info "==================== 安装 Node 依赖 ===================="
info "开始安装 Node 依赖"
if [ -f "$ROOT_DIR/package.json" ]; then
  info "进入目录：$ROOT_DIR"
  info "正在执行：pnpm install"
  (cd "$ROOT_DIR" && pnpm install --registry=https://registry.npmmirror.com) || error "Node 依赖安装失败"
else
  warn "未找到 $ROOT_DIR/package.json 文件，请检查路径是否正确"
fi
info "==================== 依赖安装完成！====================\n"

info "==================== dist打包 ===================="
info "开始执行：pnpm run build (server)"
(pushd "$ROOT_DIR/server" > /dev/null && pnpm run build; popd > /dev/null) || error "dist打包失败"
info "==================== dist打包完成！====================\n"

info "下一步：执行 ./prod_run.sh 启动服务"
