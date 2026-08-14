#!/bin/bash
if [ -z "${BASH_VERSION:-}" ]; then exec /usr/bin/env bash "$0" "$@"; fi
set -euo pipefail
ROOT_DIR="$(pwd)"
PREVIEW_DIR="/source/preview"

# ==================== 配置项 ====================
SERVER_DIR="app"
EXPO_DIR="expo"
CHECK_HASH_SCRIPT="$ROOT_DIR/check_hash.py"

check_command() {
  if ! command -v "$1" &> /dev/null; then
    echo "error:命令 $1 未找到，请先安装"
  fi
}

echo "==================== 开始构建 ===================="

echo "检查根目录 pre_install.py"
if [ -f "$PREVIEW_DIR/pre_install.py" ]; then
  echo "执行：python $PREVIEW_DIR/pre_install.py"
  python "$PREVIEW_DIR/pre_install.py" || echo "pre_install.py 执行失败"
fi

echo "开始执行构建脚本（build_dev.sh）..."
echo "正在检查依赖命令是否存在..."
# 检查核心命令
check_command "pnpm"
check_command "npm"

echo "==================== 安装项目依赖 ===================="
if [ ! -f "package.json" ]; then
  echo "项目目录下无 package.json，不是合法的 Node.js 项目"
fi
# 步骤 2.1/2.2：安装项目依赖
pnpm install --registry=https://registry.npmmirror.com || echo "Expo 项目依赖安装失败（pnpm 执行出错）"

echo "检查根目录 post_install.py"
if [ -f "$PREVIEW_DIR/post_install.py" ]; then
  echo "执行：python $PREVIEW_DIR/post_install.py"
  python "$PREVIEW_DIR/post_install.py" || echo "post_install.py 执行失败"
fi

echo "==================== 依赖安装完成！====================\n"
echo "下一步：执行 ./dev_run.sh 启动服务"
