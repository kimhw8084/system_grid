import ast
from pathlib import Path


SOURCE = Path(__file__).resolve().parents[1] / "app" / "api" / "far.py"
MODULE = ast.parse(SOURCE.read_text(encoding="utf-8"), filename=str(SOURCE))
FUNCTIONS = {
    node.name: node
    for node in MODULE.body
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
}


def _router_decorators(function_name: str):
    function = FUNCTIONS[function_name]
    decorators = []
    for decorator in function.decorator_list:
        if not isinstance(decorator, ast.Call):
            continue
        target = decorator.func
        if not (
            isinstance(target, ast.Attribute)
            and isinstance(target.value, ast.Name)
            and target.value.id == "router"
            and decorator.args
            and isinstance(decorator.args[0], ast.Constant)
            and isinstance(decorator.args[0].value, str)
        ):
            continue
        include_in_schema = True
        for keyword in decorator.keywords:
            if keyword.arg == "include_in_schema":
                include_in_schema = ast.literal_eval(keyword.value)
        decorators.append((target.attr, decorator.args[0].value, include_in_schema))
    return decorators


def _has_deleted_assignment(function_name: str, value: bool) -> bool:
    function = FUNCTIONS[function_name]
    for node in ast.walk(function):
        if not isinstance(node, ast.Assign) or len(node.targets) != 1:
            continue
        target = node.targets[0]
        if (
            isinstance(target, ast.Attribute)
            and isinstance(target.value, ast.Name)
            and target.value.id == "mode"
            and target.attr == "is_deleted"
            and isinstance(node.value, ast.Constant)
            and node.value.value is value
        ):
            return True
    return False


def _has_version_increment(function_name: str) -> bool:
    function = FUNCTIONS[function_name]
    for node in ast.walk(function):
        if not isinstance(node, ast.Assign) or len(node.targets) != 1:
            continue
        target = node.targets[0]
        value = node.value
        if not (
            isinstance(target, ast.Attribute)
            and isinstance(target.value, ast.Name)
            and target.value.id == "mode"
            and target.attr == "version"
            and isinstance(value, ast.BinOp)
            and isinstance(value.op, ast.Add)
            and isinstance(value.right, ast.Constant)
            and value.right.value == 1
        ):
            continue
        return True
    return False


def _history_messages(function_name: str) -> list[str]:
    function = FUNCTIONS[function_name]
    messages = []
    for node in ast.walk(function):
        call = node.value if isinstance(node, ast.Await) else node
        if not (
            isinstance(call, ast.Call)
            and isinstance(call.func, ast.Name)
            and call.func.id == "save_far_history"
            and len(call.args) >= 4
            and isinstance(call.args[3], ast.Constant)
            and isinstance(call.args[3].value, str)
        ):
            continue
        messages.append(call.args[3].value)
    return messages


def _has_db_delete(function_name: str) -> bool:
    function = FUNCTIONS[function_name]
    return any(
        isinstance(node, ast.Call)
        and isinstance(node.func, ast.Attribute)
        and isinstance(node.func.value, ast.Name)
        and node.func.value.id == "db"
        and node.func.attr == "delete"
        for node in ast.walk(function)
    )


def test_far_archive_restore_vocabulary_keeps_legacy_aliases_hidden():
    assert _router_decorators("archive_failure_mode") == [
        ("post", "/modes/{mode_id}/archive", True),
        ("delete", "/modes/{mode_id}", False),
    ]
    assert _router_decorators("bulk_archive_failure_modes") == [
        ("post", "/modes/bulk-archive", True),
        ("post", "/modes/bulk-delete", False),
    ]
    assert _router_decorators("restore_failure_mode") == [
        ("post", "/modes/{mode_id}/restore", True),
    ]
    assert _router_decorators("bulk_restore_failure_modes") == [
        ("post", "/modes/bulk-restore", True),
    ]

    for function_name in ("archive_failure_mode", "bulk_archive_failure_modes"):
        assert _has_deleted_assignment(function_name, True)
        assert _has_version_increment(function_name)
        assert "Archived failure vector" in _history_messages(function_name)
        assert not _has_db_delete(function_name)

    for function_name in ("restore_failure_mode", "bulk_restore_failure_modes"):
        assert _has_deleted_assignment(function_name, False)
        assert _has_version_increment(function_name)
        assert "Restored failure vector" in _history_messages(function_name)
        assert not _has_db_delete(function_name)

    all_routes = [
        route
        for function_name in FUNCTIONS
        for route in _router_decorators(function_name)
    ]
    assert not any("purge" in path for _, path, _ in all_routes)
