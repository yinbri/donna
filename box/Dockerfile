FROM ghcr.io/astral-sh/uv:0.13.9 AS uv
FROM python:3.12-slim

COPY --from=uv /uv /bin/uv
WORKDIR /opt/donna/box
COPY box/pyproject.toml box/uv.lock ./
RUN uv sync --locked --no-dev --extra live
COPY box/main.py box/models.py box/fixture_data.py box/panel.py box/research.py ./
COPY fixtures/dossier.json fixtures/panel.json fixtures/conversation.json /opt/donna/fixtures/

ENV BOX_DATA_DIR=/data/dossiers
ENV PORT=8080
EXPOSE 8080
CMD ["/opt/donna/box/.venv/bin/python", "/opt/donna/box/main.py"]
