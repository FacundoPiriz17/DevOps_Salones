#!/bin/sh
# Runs only when MySQL initializes an empty PVC. Never echoes database passwords.
set -eu
set +x
for variable in DB_LOGIN_PASSWORD DB_APP_PASSWORD DB_ADMIN_PASSWORD DB_FUNC_PASSWORD DB_PART_PASSWORD; do
    eval "password=\${$variable:-}"
    case "$password" in
        ''|*[!a-zA-Z0-9_-]*) echo "$variable must contain only letters, digits, _ or -" >&2; exit 2 ;;
    esac
    [ "${#password}" -ge 24 ] || { echo "$variable must contain at least 24 characters" >&2; exit 2; }
done
sql_file=$(mktemp)
trap 'rm -f "$sql_file"' EXIT HUP INT TERM
sed \
    -e "s/IDENTIFIED BY 'login_pass'/IDENTIFIED BY '$DB_LOGIN_PASSWORD'/g" \
    -e "s/IDENTIFIED BY 'ucurooms_password'/IDENTIFIED BY '$DB_APP_PASSWORD'/g" \
    -e "s/IDENTIFIED BY 'admin_pass'/IDENTIFIED BY '$DB_ADMIN_PASSWORD'/g" \
    -e "s/IDENTIFIED BY 'funcionario_pass'/IDENTIFIED BY '$DB_FUNC_PASSWORD'/g" \
    -e "s/IDENTIFIED BY 'participante_pass'/IDENTIFIED BY '$DB_PART_PASSWORD'/g" \
    /opt/salones-init/devops_init.sql > "$sql_file"
MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql --protocol=socket -uroot < "$sql_file"
rm -f "$sql_file"
trap - EXIT HUP INT TERM
