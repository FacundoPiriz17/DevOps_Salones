FROM python:3.12

ENV LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    PYTHONIOENCODING=utf-8 \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    FLASK_DEBUG=1

WORKDIR /API
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

EXPOSE 5000
# Flask's reloader watches the source bind mount provided by Compose.
CMD ["flask", "--app", "app", "run", "--host=0.0.0.0", "--debug"]
