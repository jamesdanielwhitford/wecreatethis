#!/bin/bash
# Bump version numbers across all Birdle files
# Usage: ./bump-version.sh [version]
# If no version provided, increments current version by 1

BIRDLE_DIR="$(cd "$(dirname "$0")/../birdle" && pwd)"

# Get current version from sw.js
CURRENT_VERSION=$(grep -o "birdle-v[0-9]*" "$BIRDLE_DIR/sw.js" | grep -o "[0-9]*")

if [ -z "$1" ]; then
  # Auto-increment
  NEW_VERSION=$((CURRENT_VERSION + 1))
else
  NEW_VERSION=$1
fi

echo "Updating from v$CURRENT_VERSION to v$NEW_VERSION..."

# Update sw.js cache name
sed -i '' "s/birdle-v[0-9]*/birdle-v$NEW_VERSION/" "$BIRDLE_DIR/sw.js"
echo "  Updated sw.js"

# Update all HTML files - script src versions
for file in "$BIRDLE_DIR"/*.html; do
  if [ -f "$file" ]; then
    # Update ?v=XX patterns in script src attributes
    sed -i '' "s/\?v=[0-9]*/?v=$NEW_VERSION/g" "$file"
    echo "  Updated $(basename "$file")"
  fi
done

# Update About version in index.html
sed -i '' "s/Birdle v[0-9]*/Birdle v$NEW_VERSION/" "$BIRDLE_DIR/index.html"
echo "  Updated About version"

echo ""
echo "Done! All files updated to v$NEW_VERSION"
echo ""
echo "Files modified:"
git -C "$BIRDLE_DIR" status --short 2>/dev/null || ls -la "$BIRDLE_DIR"/*.html "$BIRDLE_DIR"/sw.js
