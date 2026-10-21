#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
: "${CI_RUN_ID:?Missing CI_RUN_ID}"
: "${REGISTRY_PREFIX:?Missing REGISTRY_PREFIX}"
APP_HOST=${APP_HOST:-salones-team9.reto-ucu.net}
APP_SCHEME=${APP_SCHEME:-https}
case "$APP_SCHEME" in https|http) ;; *) echo 'APP_SCHEME must be https or http' >&2; exit 2 ;; esac
INGRESS_CLASS=${INGRESS_CLASS:-apisix}
printf '%s\n' "$INGRESS_CLASS" | grep -Eq '^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$' || exit 2
K8S_NAMESPACE=${K8S_NAMESPACE:-alumno-team9}
case "$CI_RUN_ID" in salones-ci-*) ;; *) exit 2 ;; esac
case "$CI_RUN_ID$REGISTRY_PREFIX" in *[!a-z0-9./:_-]*) echo 'Invalid image reference' >&2; exit 2 ;; esac
case "$REGISTRY_PREFIX" in ''|/*|*/|-*) echo 'Invalid registry prefix' >&2; exit 2 ;; esac
printf '%s\n' "$APP_HOST" | grep -Eq '^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z0-9]([a-z0-9-]*[a-z0-9])?$' || exit 2
printf '%s\n' "$K8S_NAMESPACE" | grep -Eq '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$' || exit 2
[ "${#K8S_NAMESPACE}" -le 63 ] || exit 2
mkdir -p reports

render() {
    # Files are from this checkout, including the shared SQL outside k8s/.
    # Check kubectl's status separately so a failing renderer cannot be hidden by sed.
    kubectl kustomize --load-restrictor LoadRestrictionsNone k8s > reports/k8s-base.yaml
    sed \
        -e "s|salones-backend:replace-by-pipeline|$REGISTRY_PREFIX/salones-backend:$CI_RUN_ID|g" \
        -e "s|salones-frontend:replace-by-pipeline|$REGISTRY_PREFIX/salones-frontend:$CI_RUN_ID|g" \
        -e "s|namespace: alumno-team9|namespace: $K8S_NAMESPACE|g" \
        -e "s|ingressClassName: apisix|ingressClassName: $INGRESS_CLASS|g" \
        -e "s|salones-team9\.reto-ucu\.net|$APP_HOST|g" \
        reports/k8s-base.yaml > reports/k8s-rendered.yaml
    rm reports/k8s-base.yaml
}

deploy() {
    : "${KUBECONFIG:?Bind the laboratory kubeconfig credential}"
    : "${APP_SECRETS_FILE:?Bind the application Secret file credential}"
    # Never source a credential file as shell code or print its values.
    awk -F= '
        /^[[:space:]]*(#|$)/ { next }
        { key=$1; value=substr($0,index($0,"=")+1); sub(/\r$/, "", value)
          if (key !~ /^(MYSQL_ROOT_PASSWORD|SECRET_KEY|DB_(LOGIN|APP|ADMIN|FUNC|PART)_PASSWORD)$/ || seen[key]++) exit 1
          if (length(value)<24 || value ~ /REPLACE_WITH/ ) exit 1
          if (key ~ /^DB_/ && value !~ /^[a-zA-Z0-9_-]+$/) exit 1
        }
        END { if (length(seen)!=7) exit 1 }
    ' "$APP_SECRETS_FILE" || { echo 'Application secrets file is invalid; see jenkins/app-secrets.env.example' >&2; exit 2; }
    render
    kubectl --request-timeout=20s -n "$K8S_NAMESPACE" get deployments >/dev/null
    kubectl -n "$K8S_NAMESPACE" create secret generic reservas-secret \
        --from-env-file="$APP_SECRETS_FILE" --dry-run=client -o yaml | kubectl -n "$K8S_NAMESPACE" apply -f -
    kubectl -n "$K8S_NAMESPACE" apply --dry-run=server -f reports/k8s-rendered.yaml >/dev/null
    kubectl -n "$K8S_NAMESPACE" apply -f reports/k8s-rendered.yaml
    for name in reservas-mysql reservas-backend reservas-frontend; do
        kubectl -n "$K8S_NAMESPACE" rollout status "deployment/$name" --timeout=300s
    done
    # Exercise both the served app and its API proxy inside the cluster.
    kubectl -n "$K8S_NAMESPACE" exec deployment/reservas-frontend -- \
        sh -ec 'wget -qO /dev/null http://127.0.0.1/; wget -qO /dev/null http://127.0.0.1/api/'
    curl_status=0
    curl --fail --location --silent --show-error --retry 12 --retry-delay 5 --retry-all-errors \
        --connect-timeout 10 --max-time 15 "$APP_SCHEME://$APP_HOST/api/" > reports/deployed-api.txt || curl_status=$?
    if [ "$curl_status" -ne 0 ]; then
        if [ "$curl_status" -eq 60 ]; then
            echo 'The laboratory HTTPS certificate is invalid or expired. Ask its administrator to renew it.' >&2
        else
            echo 'Public URL verification failed; inspect the Ingress and laboratory routing.' >&2
        fi
        exit "$curl_status"
    fi
    grep -q 'Proyecto DevOps' reports/deployed-api.txt || {
        echo 'Public URL did not return the Salones API. Check the laboratory routing and Ingress.' >&2
        exit 1
    }
    printf '%s://%s\n' "$APP_SCHEME" "$APP_HOST" > reports/deployment-url.txt
}

case "${1:-render}" in
    render) render ;;
    deploy) deploy ;;
    *) echo 'Usage: sh jenkins/deploy.sh [render|deploy]' >&2; exit 2 ;;
esac
