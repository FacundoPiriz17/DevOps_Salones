pipeline {
    agent any

    options {
        skipDefaultCheckout()
        disableConcurrentBuilds()
    }

    environment {
        IMAGE_NAME = "api-notas:${env.BUILD_NUMBER}"
        CONTAINER_NAME = 'api-notas'
        DATA_VOLUME = 'api-notas-data'
        HOST_PORT = '8082'
    }

    stages {
        stage('Clonar repositorio') {
            steps {
                checkout scm
            }
        }

        stage('Verificar Docker') {
            steps {
                sh 'docker info > /dev/null'
            }
        }

        stage('Construir imagen') {
            steps {
                sh 'docker build -t "$IMAGE_NAME" .'
            }
        }

        stage('Tests unitarios') {
            steps {
                sh '''
                    docker run --rm "$IMAGE_NAME" \
                        python -m unittest discover -s tests -v
                '''
            }
        }

        stage('Desplegar') {
            steps {
                sh '''
                    set -eu

                    docker volume create "$DATA_VOLUME"

                    existing=$(docker ps -aq --filter "name=^/${CONTAINER_NAME}$")
                    if [ -n "$existing" ]; then
                        docker stop "$CONTAINER_NAME"
                        docker rm "$CONTAINER_NAME"
                    fi

                    docker run -d \
                        --name "$CONTAINER_NAME" \
                        --restart unless-stopped \
                        -p "${HOST_PORT}:5000" \
                        -v "${DATA_VOLUME}:/data" \
                        -e INSTANCE_NAME=jenkins \
                        "$IMAGE_NAME"
                '''
            }
        }

        stage('Verificar respuesta') {
            steps {
                retry(5) {
                    sleep time: 2, unit: 'SECONDS'
                    sh '''
                        docker exec "$CONTAINER_NAME" python -c \
                            "import urllib.request; r = urllib.request.urlopen('http://127.0.0.1:5000/', timeout=5); assert r.status == 200"
                    '''
                }
            }
            post {
                failure {
                    sh 'docker logs --tail 100 "$CONTAINER_NAME" || true'
                }
            }
        }
    }

    post {
        success {
            echo "API desplegada y verificada. Puerto del host Docker: ${env.HOST_PORT}"
        }
        failure {
            echo 'El pipeline falló. Revisá los logs de la etapa.'
        }
        cleanup {
            deleteDir()
        }
    }
}
