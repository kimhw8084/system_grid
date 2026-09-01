from __future__ import annotations

import ast
import unittest
from pathlib import Path


def _load_pure_validator():
    """Load only validate_parent_chain from the production source.

    The helper module also contains FastAPI/SQLAlchemy integration. The executor's
    focused backend stage intentionally runs in bare Python, so importing the full
    module would test dependency provisioning rather than the pure hierarchy
    contract. Extracting the function AST keeps this proof hermetic while still
    executing the exact production function body.
    """
    source_path = Path(__file__).resolve().parents[1] / "app" / "api" / "project_hierarchy.py"
    source = source_path.read_text(encoding="utf-8")
    tree = ast.parse(source, filename=str(source_path))
    function = next(
        node
        for node in tree.body
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == "validate_parent_chain"
    )
    module = ast.Module(
        body=[
            ast.ImportFrom(module="__future__", names=[ast.alias(name="annotations")], level=0),
            ast.ImportFrom(
                module="typing",
                names=[ast.alias(name="Any"), ast.alias(name="Mapping"), ast.alias(name="Optional")],
                level=0,
            ),
            function,
        ],
        type_ignores=[],
    )
    ast.fix_missing_locations(module)
    namespace: dict[str, object] = {}
    exec(compile(module, str(source_path), "exec"), namespace)
    return namespace["validate_parent_chain"]


validate_parent_chain = _load_pure_validator()


class ProjectHierarchyContractTest(unittest.TestCase):
    def setUp(self):
        self.records = {
            1: {"parent_project_id": None, "is_deleted": False},
            2: {"parent_project_id": 1, "is_deleted": False},
            3: {"parent_project_id": 2, "is_deleted": False},
            4: {"parent_project_id": None, "is_deleted": True},
        }

    def test_null_parent_is_explicit_top_level(self):
        validate_parent_chain(self.records, 3, None)

    def test_valid_reassignment_keeps_descendants_out_of_validation(self):
        validate_parent_chain(self.records, 3, 1)

    def test_missing_parent_is_rejected(self):
        with self.assertRaisesRegex(LookupError, "unavailable"):
            validate_parent_chain(self.records, 3, 999)

    def test_deleted_parent_is_rejected(self):
        with self.assertRaisesRegex(LookupError, "unavailable"):
            validate_parent_chain(self.records, 3, 4)

    def test_self_parent_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "own parent"):
            validate_parent_chain(self.records, 2, 2)

    def test_ancestor_cycle_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "cycle"):
            validate_parent_chain(self.records, 1, 3)

    def test_existing_cycle_in_candidate_chain_is_rejected(self):
        records = {
            8: {"parent_project_id": 9, "is_deleted": False},
            9: {"parent_project_id": 8, "is_deleted": False},
        }
        with self.assertRaisesRegex(ValueError, "cycle"):
            validate_parent_chain(records, 7, 8)


if __name__ == "__main__":
    unittest.main()
