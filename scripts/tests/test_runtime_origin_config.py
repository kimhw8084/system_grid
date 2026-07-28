from pathlib import Path

from scripts.runtime_origin_config import RuntimeOriginError, resolve_runtime_origins


def test_forwarded_origins_are_normalized_and_merged():
    runtime = resolve_runtime_origins(
        api_base_url="http://8000.vscode.company.example/",
        frontend_origin="http://5173.vscode.company.example/",
        backend_host="127.0.0.1",
        backend_port=8000,
        frontend_host="127.0.0.1",
        frontend_port=5173,
        allowed_hosts="internal-api",
        cors_origins="https://existing.example",
    )

    assert runtime.api_base_url == "http://8000.vscode.company.example"
    assert runtime.frontend_origin == "http://5173.vscode.company.example"
    assert runtime.api_hostname == "8000.vscode.company.example"
    assert runtime.allowed_hosts.split(",") == [
        "internal-api",
        "8000.vscode.company.example",
        "127.0.0.1",
        "localhost",
        "test",
        "testserver",
    ]
    assert runtime.cors_origins.split(",") == [
        "https://existing.example",
        "http://5173.vscode.company.example",
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ]


def test_api_base_rejects_paths():
    try:
        resolve_runtime_origins(
            api_base_url="https://api.example.com/api/v1",
            frontend_origin="https://ui.example.com",
            backend_host="127.0.0.1",
            backend_port=8000,
            frontend_host="127.0.0.1",
            frontend_port=5173,
        )
    except RuntimeOriginError as exc:
        assert "origin only" in str(exc)
    else:
        raise AssertionError("expected RuntimeOriginError")


def test_https_frontend_rejects_http_api():
    try:
        resolve_runtime_origins(
            api_base_url="http://api.example.com",
            frontend_origin="https://ui.example.com",
            backend_host="127.0.0.1",
            backend_port=8000,
            frontend_host="127.0.0.1",
            frontend_port=5173,
        )
    except RuntimeOriginError as exc:
        assert "Mixed-content" in str(exc)
    else:
        raise AssertionError("expected RuntimeOriginError")


def test_start_local_restores_tracked_runtime_env_on_exit():
    script = (Path(__file__).resolve().parents[1] / "start-local.sh").read_text(encoding="utf-8")

    assert 'BACKEND_ENV_BACKUP_FILE="$(mktemp -t sysgrid-backend-env)"' in script
    assert 'restore_backend_runtime_env()' in script
    assert 'cp -p "$BACKEND_ENV_BACKUP_FILE" "$LOCAL_BACKEND_ENV_FILE"' in script
    assert 'restore_backend_runtime_env || true' in script
    assert 'trap cleanup EXIT INT TERM' in script
