#!/bin/bash
# Cloud build script for Windows executable

echo "🚀 Building Invoify Windows App via GitHub Actions..."

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Not in a git repository. Please run 'git init' first."
    exit 1
fi

# Check if GitHub remote exists
if ! git remote get-url origin &> /dev/null; then
    echo "❌ No GitHub remote found. Please add your GitHub repository:"
    echo "git remote add origin https://github.com/yourusername/your-repo.git"
    exit 1
fi

echo "📤 Pushing code to GitHub..."
git add .
git commit -m "Trigger Windows build $(date)"
git push origin main

echo "✅ Code pushed! Your Windows build will start automatically."
echo ""
echo "🔗 Check build status at:"
echo "   https://github.com/$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/actions"
echo ""
echo "📦 Once complete, download your .exe file from the Actions artifacts!"
echo ""
echo "⏱️  Build typically takes 5-10 minutes"