FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app
RUN apt-get update \
    && apt-get install --no-install-recommends -y libglib2.0-0 libgomp1 libgl1 \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
COPY src ./src
ARG INSTALL_OCR=false
RUN python -m pip install . \
    && if [ "$INSTALL_OCR" = "true" ]; then \
         python -m pip install --index-url https://www.paddlepaddle.org.cn/packages/stable/cpu/ "paddlepaddle>=3,<4" \
         && python -m pip install ".[ocr]"; \
       fi

RUN useradd --system --uid 10001 --create-home stockia \
    && chown -R stockia:stockia /app
USER stockia

EXPOSE 8010
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8010/healthz', timeout=2)"

CMD ["uvicorn", "stockia_ai.app:app", "--app-dir", "/app/src", "--host", "0.0.0.0", "--port", "8010"]
