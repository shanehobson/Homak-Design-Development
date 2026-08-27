#!/usr/bin/env bash
# Fetch the hosted videos into public/videos/ so `astro dev` can serve them.
# The directory is gitignored; this is how a fresh clone gets the media.
source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"
require_stack

mkdir -p "$LOCAL_MEDIA_DIR"
echo "Pulling s3://$MEDIA_BUCKET/videos/ -> $LOCAL_MEDIA_DIR (profile: $AWS_PROFILE)"
aws s3 sync "s3://$MEDIA_BUCKET/videos/" "$LOCAL_MEDIA_DIR" --region "$REGION"
echo "Done."
