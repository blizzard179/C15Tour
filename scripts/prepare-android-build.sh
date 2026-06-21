#!/usr/bin/env sh
set -eu

DESTINATION="${1:-/d/C15TourForBuildAPK}"

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd -P)"

MOBILE_SOURCE="$REPO_ROOT/mobile/c15tour-mobile"
SHARED_SOURCE="$REPO_ROOT/shared"
DESTINATION_ROOT="$(mkdir -p "$DESTINATION" && cd -- "$DESTINATION" && pwd -P)"

if [[ ! -f "$MOBILE_SOURCE/package.json" ]]; then
  echo "Mobile project not found: $MOBILE_SOURCE" >&2
  exit 1
fi

if [[ ! -d "$SHARED_SOURCE" ]]; then
  echo "Shared folder not found: $SHARED_SOURCE" >&2
  exit 1
fi

case "$DESTINATION_ROOT" in
  "/"|"/c"|"/c/"|"/d"|"/d/")
    echo "Refusing to clear a drive/root folder: $DESTINATION_ROOT" >&2
    exit 1
    ;;
esac

case "$DESTINATION_ROOT" in
  "$REPO_ROOT"|"$REPO_ROOT"/*)
    echo "Refusing to copy inside the source repository: $DESTINATION_ROOT" >&2
    exit 1
    ;;
esac

case "$REPO_ROOT" in
  "$DESTINATION_ROOT"/*)
    echo "Refusing to copy because destination contains the source repository: $DESTINATION_ROOT" >&2
    exit 1
    ;;
esac

echo "Clearing $DESTINATION_ROOT"
rm -rf -- "$DESTINATION_ROOT"/*
rm -rf -- "$DESTINATION_ROOT"/.[!.]* "$DESTINATION_ROOT"/..?* 2>/dev/null || true

mkdir -p "$DESTINATION_ROOT/mobile"

echo "Copying mobile project"
mkdir -p "$DESTINATION_ROOT/mobile/c15tour-mobile"
cp -a "$MOBILE_SOURCE/." "$DESTINATION_ROOT/mobile/c15tour-mobile/"
rm -rf -- \
  "$DESTINATION_ROOT/mobile/c15tour-mobile/.expo" \
  "$DESTINATION_ROOT/mobile/c15tour-mobile/.vscode" \
  "$DESTINATION_ROOT/mobile/c15tour-mobile/dist" \
  "$DESTINATION_ROOT/mobile/c15tour-mobile/android/.gradle" \
  "$DESTINATION_ROOT/mobile/c15tour-mobile/android/build" \
  "$DESTINATION_ROOT/mobile/c15tour-mobile/android/app/.cxx" \
  "$DESTINATION_ROOT/mobile/c15tour-mobile/android/app/build"

echo "Copying shared assets"
mkdir -p "$DESTINATION_ROOT/shared"
cp -a "$SHARED_SOURCE/." "$DESTINATION_ROOT/shared/"
rm -rf -- "$DESTINATION_ROOT/shared/.git"

echo ""
echo "Android build copy prepared:"
echo "  $DESTINATION_ROOT"
echo ""
echo "Open this folder in Android Studio:"
echo "  $DESTINATION_ROOT/mobile/c15tour-mobile/android"
