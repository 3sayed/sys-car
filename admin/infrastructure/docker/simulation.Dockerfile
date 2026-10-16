FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends blender python3 ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home worker
WORKDIR /engine
COPY simulation-engine/ .
USER worker
ENV BLENDER_BIN=/usr/bin/blender
EXPOSE 8090
CMD ["python3","main.py","--host","0.0.0.0","--port","8090"]
