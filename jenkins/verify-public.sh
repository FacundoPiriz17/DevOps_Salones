#!/bin/sh
# Anonymous health check: intentionally runs outside all credentials bindings.
set -eu
cd "$(dirname "$0")/.."
APP_HOST=${APP_HOST:-salones-team9.reto-ucu.net}
APP_SCHEME=${APP_SCHEME:-https}
PUBLIC_TLS_POLICY=${PUBLIC_TLS_POLICY:-strict}
LAB_TLS_PUBLIC_KEY_PIN=${LAB_TLS_PUBLIC_KEY_PIN:-}
reports=${PUBLIC_REPORTS_DIR:-reports}
case "$APP_SCHEME" in https|http) ;; *) echo 'Invalid APP_SCHEME' >&2; exit 2 ;; esac
case "$PUBLIC_TLS_POLICY" in strict|pinned-lab) ;; *) echo 'Invalid PUBLIC_TLS_POLICY' >&2; exit 2 ;; esac
printf '%s\n' "$APP_HOST" | grep -Eq '^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z0-9]([a-z0-9-]*[a-z0-9])?$' || exit 2
mkdir -p "$reports"
rm -f "$reports/deployment-url.txt" "$reports/public-tls-warning.txt"
url="$APP_SCHEME://$APP_HOST"
printf '%s\n' "$url" > "$reports/public-url-target.txt"

request() {
    # Retry transient HTTP/network errors, never repeat a permanent TLS failure.
    curl --fail --location --max-redirs 3 --proto-redir '=https' \
        --silent --show-error --retry 5 --retry-delay 2 --retry-connrefused \
        --connect-timeout 10 --max-time 15 "$@" "$url/api/" \
        > "$reports/deployed-api.txt" 2> "$reports/public-url-curl.log"
}

status=0
used_pin=false
request || status=$?
if [ "$status" -eq 60 ] && [ "$PUBLIC_TLS_POLICY" = pinned-lab ]; then
    # The exception is restricted to our laboratory host and to a fixed public key.
    # A different key still fails (curl 90), even though the certificate has expired.
    if [ "$APP_SCHEME://$APP_HOST" != https://salones-team9.reto-ucu.net ]; then
        echo 'The pinned laboratory exception is not allowed for this URL.' >&2
        exit 60
    fi
    printf '%s\n' "$LAB_TLS_PUBLIC_KEY_PIN" | grep -Eq '^sha256//[A-Za-z0-9+/]{43}=$' || {
        echo 'A SHA-256 public-key pin is required for the laboratory exception.' >&2
        exit 2
    }
    status=0
    request --proto '=https' --insecure --pinnedpubkey "$LAB_TLS_PUBLIC_KEY_PIN" || status=$?
    used_pin=true
fi
if [ "$status" -ne 0 ]; then
    cat "$reports/public-url-curl.log" >&2
    case "$status" in
        60) echo 'Public TLS validation failed. The laboratory certificate needs renewal.' >&2 ;;
        90) echo 'The laboratory public key changed. Refusing the TLS exception.' >&2 ;;
        *) echo 'Public URL verification failed; inspect routing and Ingress.' >&2 ;;
    esac
    exit "$status"
fi
grep -Fq 'API de Gestión de Salas UCU' "$reports/deployed-api.txt" || {
    echo 'The public URL returned a different application, not the Salones API.' >&2
    exit 1
}
if [ "$used_pin" = true ]; then
    printf '%s\n' 'WARNING: laboratory TLS certificate validation failed; anonymous API check passed with the configured public-key pin. Certificate renewal remains pending.' \
        | tee "$reports/public-tls-warning.txt"
fi
printf '%s\n' "$url" > "$reports/deployment-url.txt"
printf 'Public Salones API verified: %s\n' "$url"
