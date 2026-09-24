import secrets
from collections import deque
from typing import Any

from starlette.responses import JSONResponse


MULTIPART_OVERHEAD_BYTES = 128 * 1024


class AnalyzeRequestGuard:
    """Authenticate and cap image uploads before multipart parsing can spool them."""

    def __init__(self, app: Any, *, max_body_bytes: int, shared_token: str | None) -> None:
        self.app = app
        self.max_body_bytes = max_body_bytes
        self.shared_token = shared_token

    async def __call__(self, scope, receive, send) -> None:
        if (
            scope["type"] != "http"
            or scope.get("method") != "POST"
            or scope.get("path") != "/v1/analyze"
        ):
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers", []))
        if self.shared_token:
            authorization = headers.get(b"authorization", b"").decode("latin-1")
            expected = f"Bearer {self.shared_token}"
            if not secrets.compare_digest(authorization, expected):
                await JSONResponse(
                    {"detail": "No autorizado."}, status_code=401
                )(scope, receive, send)
                return

        raw_length = headers.get(b"content-length")
        if raw_length:
            try:
                content_length = int(raw_length)
            except ValueError:
                await JSONResponse(
                    {"detail": "Content-Length inválido."}, status_code=400
                )(scope, receive, send)
                return
            if content_length < 0:
                await JSONResponse(
                    {"detail": "Content-Length inválido."}, status_code=400
                )(scope, receive, send)
                return
            if content_length > self.max_body_bytes:
                await JSONResponse(
                    {"detail": "La solicitud supera el tamaño máximo permitido."},
                    status_code=413,
                )(scope, receive, send)
                return

        buffered = deque()
        body_size = 0
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            if message["type"] != "http.request":
                continue
            body_size += len(message.get("body", b""))
            if body_size > self.max_body_bytes:
                await JSONResponse(
                    {"detail": "La solicitud supera el tamaño máximo permitido."},
                    status_code=413,
                )(scope, receive, send)
                return
            buffered.append(message)
            if not message.get("more_body", False):
                break

        async def replay_receive():
            if buffered:
                return buffered.popleft()
            return await receive()

        await self.app(scope, replay_receive, send)
