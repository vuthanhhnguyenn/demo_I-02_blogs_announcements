#!/usr/bin/env bash
# Copy the task definition's newest revision with only the image swapped (pinned by digest),
# roll the service onto it and check it moved. Same approach as fitness-backend-v2's
# ecs-pin-images.sh + ecs-deploy-services.sh.
#
# Usage: CLUSTER=… SERVICE=… FAMILY=… REPO_URI=… IMAGE_DIGEST=sha256:… ./scripts/ecs-deploy.sh
set -euo pipefail

CLUSTER=${CLUSTER:?CLUSTER is required}
SERVICE=${SERVICE:?SERVICE is required}
FAMILY=${FAMILY:?FAMILY is required}
REPO_URI=${REPO_URI:?REPO_URI is required}
IMAGE_DIGEST=${IMAGE_DIGEST:?IMAGE_DIGEST is required (sha256:…)}

case "$IMAGE_DIGEST" in
  sha256:*) ;;
  *) echo "!! IMAGE_DIGEST is not a sha256 digest: ${IMAGE_DIGEST}" >&2; exit 1 ;;
esac

new_image="${REPO_URI}@${IMAGE_DIGEST}"

# Read-only fields describe-task-definition returns that register-task-definition rejects.
READONLY_FIELDS='del(.taskDefinitionArn, .revision, .status, .requiresAttributes,
                     .compatibilities, .registeredAt, .registeredBy, .deregisteredAt)'

td=$(aws ecs describe-task-definition --task-definition "$FAMILY" \
  --query 'taskDefinition' --output json)

# App container = the one on this repo's image; a placeholder image is accepted only if it is the sole container.
idx=$(printf '%s' "$td" | jq -r --arg repo "$REPO_URI" '
  .containerDefinitions as $c
  | [range(0; $c | length) | select($c[.].image | startswith($repo + ":") or startswith($repo + "@"))] as $m
  | if ($m | length) == 1 then $m[0]
    elif ($m | length) == 0 and ($c | length) == 1 then 0
    else "none" end')

if [ "$idx" = "none" ]; then
  echo "!! ${FAMILY}: cannot tell which container is the app — containers:" >&2
  printf '%s' "$td" | jq -r '.containerDefinitions[] | "   \(.name)  \(.image)"' >&2
  exit 1
fi

container=$(printf '%s' "$td" | jq -r ".containerDefinitions[${idx}].name")
current_image=$(printf '%s' "$td" | jq -r ".containerDefinitions[${idx}].image")

if [ "$current_image" = "$new_image" ]; then
  arn=$(printf '%s' "$td" | jq -r '.taskDefinitionArn')
  echo "==> ${FAMILY}: ${container} already on ${IMAGE_DIGEST} (${arn##*/})"
else
  new_td=$(printf '%s' "$td" | jq --arg img "$new_image" \
    ".containerDefinitions[${idx}].image = \$img | ${READONLY_FIELDS}")
  arn=$(aws ecs register-task-definition --cli-input-json "$new_td" \
    --query 'taskDefinition.taskDefinitionArn' --output text)
  echo "==> ${FAMILY}: registered ${arn##*/} (${container} <- ${IMAGE_DIGEST})"
fi

aws ecs update-service --cluster "$CLUSTER" --service "$SERVICE" --task-definition "$arn" \
  --query 'service.taskDefinition' --output text >/dev/null
echo "==> ${SERVICE}: rolling onto ${arn##*/}"

aws ecs wait services-stable --cluster "$CLUSTER" --services "$SERVICE"

# services-stable also succeeds after a circuit-breaker rollback.
running=$(aws ecs describe-services --cluster "$CLUSTER" --services "$SERVICE" \
  --query 'services[0].taskDefinition' --output text)
if [ "$running" != "$arn" ]; then
  echo "!! ${SERVICE}: runs ${running##*/}, expected ${arn##*/} (circuit breaker rollback?)" >&2
  exit 1
fi
echo "==> ${SERVICE}: on ${arn##*/}"
