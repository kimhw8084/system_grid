from app.api.workspaces import definition_for, sanitize_definition


def test_projects_workspace_definition_registers_existing_saved_view_platform():
    definition = definition_for("projects")
    assert definition.key == "projects"
    assert definition.route == "/projects"
    assert definition.archetype == "hybrid"
    assert definition.capabilities == ["saved_views", "search", "filters", "deep_links", "custom_body"]
    assert definition.state_schema.allowed_keys == ["searchTerm", "filters", "activeTab", "mode"]
    assert definition.state_schema.quick_filter_keys == ["status", "priority", "watch"]
    assert definition.state_schema.active_tabs == [
        "overview", "tasks", "timeline", "board", "files", "updates", "reports", "insights", "portfolio"
    ]
    assert definition.state_schema.modes == [
        "order", "health", "priority", "deadline", "progress", "blocked", "value", "name"
    ]


def test_projects_workspace_saved_view_sanitization_is_bounded_and_deterministic():
    assert sanitize_definition(
        "projects",
        {
            "searchTerm": "  release readiness  ",
            "filters": {
                "status": ["In Progress", "In Progress", ""],
                "priority": ["Highest"],
                "watch": ["watched"],
                "unsupported": ["drop"],
            },
            "activeTab": "reports",
            "mode": "deadline",
            "unsupported": "drop",
        },
    ) == {
        "searchTerm": "release readiness",
        "filters": {
            "status": ["In Progress"],
            "priority": ["Highest"],
            "watch": ["watched"],
        },
        "activeTab": "reports",
        "mode": "deadline",
    }


def test_projects_workspace_saved_view_rejects_unknown_view_and_sort_by_falling_back():
    normalized = sanitize_definition(
        "projects",
        {
            "searchTerm": 42,
            "filters": {"status": "bad", "priority": None, "watch": ["watched", "watched"]},
            "activeTab": "not-a-project-view",
            "mode": "not-a-project-sort",
        },
    )
    assert normalized["searchTerm"] == ""
    assert normalized["filters"] == {"status": [], "priority": [], "watch": ["watched"]}
    assert normalized["activeTab"] == "overview"
    assert normalized["mode"] == "order"
