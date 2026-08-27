#!/usr/bin/env bash
# Upload public/videos/ to the media bucket and invalidate the CDN copies.
source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"
require_stack

if [[ ! -d "$LOCAL_MEDIA_DIR" ]]; then
  echo "No local media directory at $LOCAL_MEDIA_DIR — nothing to push." >&2
  exit 1
fi

echo "Pushing $LOCAL_MEDIA_DIR -> s3://$MEDIA_BUCKET/videos/ (profile: $AWS_PROFILE)"
aws s3 sync "$LOCAL_MEDIA_DIR" "s3://$MEDIA_BUCKET/videos/" \
  --region "$REGION" \
  --delete \
  --cache-control "public, max-age=31536000, immutable"

DIST_ID="$(stack_output DistributionId)"
if [[ -n "$DIST_ID" && "$DIST_ID" != "None" ]]; then
  echo "Invalidating /videos/* on $DIST_ID"
  aws cloudfront create-invalidation \
    --distribution-id "$DIST_ID" --paths "/videos/*" \
    --query 'Invalidation.Id' --output text
fi

echo "Done."
