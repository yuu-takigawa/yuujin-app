#!/bin/bash
# Yuujin PWA 前端部署脚本
# 用法: bash deploy-web.sh

set -e

echo ">>> 1. 构建 Web 产物"
npx expo export --platform web

echo ">>> 2. 替换 index.html（Expo 默认模板 → 自定义 PWA 模板）"
# 提取 JS bundle 路径并注入到自定义模板
BUNDLE=$(grep -o '/_expo/static/js/web/entry-[^"]*\.js' dist/index.html)
sed -e "s|<!-- JS bundle will be injected by deploy script -->|<link rel=\"preload\" href=\"${BUNDLE}\" as=\"script\" />\n<script src=\"${BUNDLE}\" defer></script>|" web/index.html > dist/index.html
cp assets/logo.svg dist/logo.svg
cp web/manifest.json dist/manifest.json
cp assets/icon-192.png dist/icon-192.png
cp assets/icon-512.png dist/icon-512.png
echo "   注入 bundle: $BUNDLE"

echo ">>> 3. 上传到 ECS"
scp -i ~/.ssh/yuujin_ecs -r dist/* root@8.136.209.228:/opt/yuujin/web/

echo ""
echo "========================================="
echo "  部署完成！http://8.136.209.228"
echo "========================================="
