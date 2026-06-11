#!/bin/bash
# FlashForge — GitHub push script
# Run this from your local machine after downloading the project files

set -e

GITHUB_TOKEN="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"
REPO_NAME="flashforge"

echo "🔧 Getting your GitHub username..."
GH_USER=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/user | python3 -c "import sys,json; print(json.load(sys.stdin)['login'])")
echo "   → Logged in as: $GH_USER"

echo ""
echo "📦 Creating GitHub repo '$REPO_NAME'..."
RESPONSE=$(curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/user/repos \
  -d "{\"name\":\"$REPO_NAME\",\"description\":\"AI-powered gamified flashcard learning game — Next.js + Supabase + Vercel\",\"private\":false,\"auto_init\":false}")

REPO_URL=$(echo $RESPONSE | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('html_url','ALREADY_EXISTS'))")
echo "   → $REPO_URL"

echo ""
echo "🚀 Pushing code..."
git remote remove origin 2>/dev/null || true
git remote add origin "https://$GITHUB_TOKEN@github.com/$GH_USER/$REPO_NAME.git"
git push -u origin main

echo ""
echo "✅ Done! Repo live at: https://github.com/$GH_USER/$REPO_NAME"
echo ""
echo "👉 Next steps:"
echo "   1. Go to https://vercel.com/new → Import your '$REPO_NAME' repo"
echo "   2. Add env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "   3. Deploy!"
