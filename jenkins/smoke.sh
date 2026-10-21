#!/bin/sh
# Exercise the exact production images and the Kubernetes MySQL initializer.
set -eu
cd "$(dirname "$0")/.."
: "${CI_RUN_ID:?Missing CI_RUN_ID}"
case "$CI_RUN_ID" in salones-ci-*) ;; *) exit 2 ;; esac
case "$CI_RUN_ID" in *[!a-z0-9-]*) exit 2 ;; esac
network="$CI_RUN_ID-prod"
db_container="$CI_RUN_ID-prod-db"
backend_container="$CI_RUN_ID-prod-backend"
frontend_container="$CI_RUN_ID-prod-frontend"
cleanup() {
    for name in "$frontend_container" "$backend_container" "$db_container"; do
        docker rm -fv "$name" >/dev/null 2>&1 || true
    done
    docker network rm "$network" >/dev/null 2>&1 || true
}
trap cleanup EXIT HUP INT TERM
mkdir -p reports
docker network create --internal "$network" >/dev/null
docker create --name "$db_container" --network "$network" \
    -e MYSQL_ROOT_PASSWORD=ci-disposable-only \
    -e DB_LOGIN_PASSWORD=ci-login-password-123456789 \
    -e DB_APP_PASSWORD=ci-app-password-12345678900 \
    -e DB_ADMIN_PASSWORD=ci-admin-password-123456789 \
    -e DB_FUNC_PASSWORD=ci-staff-password-123456789 \
    -e DB_PART_PASSWORD=ci-student-password-123456789 \
    --entrypoint sh mysql:8.0 -ec \
    'chmod 0444 /docker-entrypoint-initdb.d/01-init.sh; exec /usr/local/bin/docker-entrypoint.sh mysqld' >/dev/null
docker cp db "$db_container:/opt/salones-init"
docker cp jenkins/mysql-init.sh "$db_container:/docker-entrypoint-initdb.d/01-init.sh"
# The entrypoint wrapper forces ConfigMap mode, including when run from Windows.
docker start "$db_container" >/dev/null
wait_database() {
    attempt=0
    until docker exec "$db_container" sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -h127.0.0.1 -uroot -Nse "SELECT 1 FROM DevOpsSalones.usuario LIMIT 1"' >/dev/null 2>&1; do
        attempt=$((attempt + 1))
        if [ "$attempt" -ge 60 ]; then
            docker logs "$db_container" > reports/production-mysql.log 2>&1
            echo 'Production MySQL initialization failed; see production-mysql.log' >&2
            exit 1
        fi
        sleep 2
    done
}
wait_database
docker run -d --name "$backend_container" --network "$network" --network-alias reservas-backend \
    -e DB_HOST="$db_container" -e DB_NAME=DevOpsSalones \
    -e SECRET_KEY=ci-production-smoke-not-for-deployment \
    -e DB_LOGIN_PASSWORD=ci-login-password-123456789 \
    -e DB_APP_PASSWORD=ci-app-password-12345678900 \
    -e DB_ADMIN_PASSWORD=ci-admin-password-123456789 \
    -e DB_FUNC_PASSWORD=ci-staff-password-123456789 \
    -e DB_PART_PASSWORD=ci-student-password-123456789 \
    "salones-backend:$CI_RUN_ID" >/dev/null
docker run -d --name "$frontend_container" --network "$network" "salones-frontend:$CI_RUN_ID" >/dev/null
attempt=0
until docker exec "$frontend_container" wget -qO /dev/null http://127.0.0.1/api/; do
    attempt=$((attempt + 1))
    [ "$attempt" -lt 30 ] || exit 1
    sleep 1
done
docker exec "$frontend_container" sh -ec 'wget -qO /dev/null http://127.0.0.1/; wget -qO /dev/null http://127.0.0.1/login'
docker exec -i "$backend_container" python - <<'PY'
from db import get_connection
for role in [None, 'Administrador', 'Funcionario', 'Participante']:
    connection = get_connection(role)
    cursor = connection.cursor()
    cursor.execute('SELECT COUNT(*) FROM usuario')
    assert cursor.fetchone()[0] > 0
    cursor.close()
    connection.close()
print('Production SQL initialization and all role credentials passed')
PY
docker restart "$db_container" >/dev/null
wait_database
docker exec "$frontend_container" wget -qO /dev/null http://127.0.0.1/api/
printf '%s\n' 'Production images, SPA routes, API proxy, SQL initialization, role credentials and MySQL restart passed.' > reports/production-smoke.txt
