#!/bin/bash
set -Eeuo pipefail

cd "${COZE_WORKSPACE_PATH:-$(pwd)}"

echo "🔍 Running validate..."
pnpm validate
echo "✅ Validate passed!"
