#!/bin/sh
set -eu

cd "$(dirname "$0")/.."
CI_RUN_ID=${CI_RUN_ID:-salones-ci-local-$$}
case "$CI_RUN_ID" in
    salones-ci-*) ;;
    *) echo 'CI_RUN_ID must start with salones-ci-' >&2; exit 2 ;;
esac
case "$CI_RUN_ID" in
    *[!a-z0-9-]*) echo 'CI_RUN_ID may only contain lowercase letters, numbers and hyphens' >&2; exit 2 ;;
esac
[ "${#CI_RUN_ID}" -le 100 ] || exit 2

TEST_IMAGE="salones-backend-tests:$CI_RUN_ID"
BACKEND_IMAGE="salones-backend:$CI_RUN_ID"
FRONTEND_IMAGE="salones-frontend:$CI_RUN_ID"
REPORTS=reports
mkdir -p "$REPORTS"

cleanup() {
    for suffix in unit pipeline mysql frontend db prod-db prod-backend prod-frontend; do
        docker rm -fv "$CI_RUN_ID-$suffix" >/dev/null 2>&1 || true
    done
    docker network rm "$CI_RUN_ID" >/dev/null 2>&1 || true
    docker network rm "$CI_RUN_ID-prod" >/dev/null 2>&1 || true
}

# docker cp works even when the Jenkins workspace is inside another container.
# No host workspace bind mount or local Python/Node installation is required.
run_container() {
    container=$1
    copy_reports=$2
    docker start -a "$container" || true
    status=$(docker inspect --format '{{.State.Status}}' "$container")
    exit_code=$(docker inspect --format '{{.State.ExitCode}}' "$container")
    docker logs "$container" > "$REPORTS/$container.log" 2>&1
    if [ "$status" != exited ]; then
        echo "Container $container did not complete" >&2
        return 125
    fi
    if [ "$copy_reports" = yes ]; then
        docker cp "$container:/reports/." "$REPORTS/"
    fi
    docker rm "$container" >/dev/null
    return "$exit_code"
}

unit() {
    docker build -f jenkins/Dockerfile.backend-tests -t "$TEST_IMAGE" Backend_Salones
    docker create --name "$CI_RUN_ID-unit" "$TEST_IMAGE" >/dev/null
    run_container "$CI_RUN_ID-unit" yes
    docker create --name "$CI_RUN_ID-pipeline" -e PUBLIC_CHECK_SCRIPT=/pipeline/verify-public.sh \
        "$TEST_IMAGE" python -m pytest /pipeline --junitxml=/reports/pipeline-unit-junit.xml >/dev/null
    docker cp jenkins/tests "$CI_RUN_ID-pipeline:/pipeline"
    docker cp jenkins/verify-public.sh "$CI_RUN_ID-pipeline:/pipeline/verify-public.sh"
    run_container "$CI_RUN_ID-pipeline" yes
}

integration() {
    docker network create --internal "$CI_RUN_ID" >/dev/null
    docker run -d --name "$CI_RUN_ID-db" --network "$CI_RUN_ID" \
        -e MYSQL_ROOT_PASSWORD=ci-disposable-only mysql:8.0 >/dev/null
    attempt=0
    until docker exec "$CI_RUN_ID-db" sh -c 'mysqladmin ping -h 127.0.0.1 -uroot -p"$MYSQL_ROOT_PASSWORD" --silent' >/dev/null 2>&1; do
        attempt=$((attempt + 1))
        if [ "$attempt" -ge 60 ]; then
            docker logs "$CI_RUN_ID-db"
            echo 'Disposable MySQL failed to become ready' >&2
            return 1
        fi
        sleep 2
    done
    docker exec -i "$CI_RUN_ID-db" sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD"' < db/devops_init.sql
    docker create --name "$CI_RUN_ID-mysql" --network "$CI_RUN_ID" \
        -e DB_HOST="$CI_RUN_ID-db" -e DB_NAME=DevOpsSalones \
        -e RUN_MYSQL_TESTS=1 -e CI_DATABASE_DISPOSABLE=1 \
        "$TEST_IMAGE" python -m pytest -m mysql \
        --junitxml=/reports/backend-mysql-junit.xml >/dev/null
    run_container "$CI_RUN_ID-mysql" yes
    docker rm -fv "$CI_RUN_ID-db" >/dev/null
    docker network rm "$CI_RUN_ID" >/dev/null
}

images() {
    docker build -f jenkins/Dockerfile.frontend.production -t "$FRONTEND_IMAGE" Frontend_Salones
    docker build -f jenkins/Dockerfile.backend.production -t "$BACKEND_IMAGE" Backend_Salones
    printf '{"backend":"%s","frontend":"%s"}\n' "$BACKEND_IMAGE" "$FRONTEND_IMAGE" > "$REPORTS/images.json"
}

publish() {
    : "${REGISTRY_PREFIX:?Set REGISTRY_PREFIX to the registry/namespace without a trailing slash}"
    case "$REGISTRY_PREFIX" in
        [a-z0-9]*) ;;
        *) echo 'Invalid registry prefix' >&2; return 2 ;;
    esac
    case "$REGISTRY_PREFIX" in
        *[!a-z0-9./:_-]*|*/) echo 'Invalid registry prefix' >&2; return 2 ;;
    esac
    docker tag "$BACKEND_IMAGE" "$REGISTRY_PREFIX/salones-backend:$CI_RUN_ID"
    docker tag "$FRONTEND_IMAGE" "$REGISTRY_PREFIX/salones-frontend:$CI_RUN_ID"
    docker push "$REGISTRY_PREFIX/salones-backend:$CI_RUN_ID"
    docker push "$REGISTRY_PREFIX/salones-frontend:$CI_RUN_ID"
    printf '{"backend":"%s/salones-backend:%s","frontend":"%s/salones-frontend:%s"}\n' \
        "$REGISTRY_PREFIX" "$CI_RUN_ID" "$REGISTRY_PREFIX" "$CI_RUN_ID" > "$REPORTS/published-images.json"
}

case "${1:-all}" in
    unit) unit ;;
    integration) integration ;;
    images) images ;;
    publish) publish ;;
    cleanup) cleanup ;;
    all) trap cleanup EXIT HUP INT TERM; unit; integration; images; sh jenkins/smoke.sh ;;
    *) echo 'Usage: sh jenkins/ci.sh [all|unit|integration|images|publish|cleanup]' >&2; exit 2 ;;
esac
