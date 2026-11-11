FROM python:3.10-slim

WORKDIR /app

# Install dependencies
COPY apps/api/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code and default directories
COPY apps/api/app /app/app
COPY schema /schema
COPY knowledge /knowledge

ENV ZDWIKI_HOST=0.0.0.0
ENV ZDWIKI_PORT=8000
ENV ZDWIKI_KNOWLEDGE_DIR=/knowledge
ENV ZDWIKI_DB_PATH=/app/var/zdwiki.db
ENV ZDWIKI_RAW_DIR=/knowledge/raw

EXPOSE 8000

CMD ["python", "-m", "app.cli.main", "serve", "--host", "0.0.0.0", "--port", "8000"]
