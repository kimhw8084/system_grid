from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


def _sanitize_error_payload(value):
    if isinstance(value, dict):
        return {key: _sanitize_error_payload(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_sanitize_error_payload(item) for item in value]
    if isinstance(value, tuple):
        return [_sanitize_error_payload(item) for item in value]
    if isinstance(value, BaseException):
        return str(value)
    return value


def standardize_validation_errors(app: FastAPI):
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={"detail": _sanitize_error_payload(exc.errors()), "message": "Validation Failed"},
        )
