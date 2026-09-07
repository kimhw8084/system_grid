# SysGrid Project View Perfection — Publisher

This package is a fail-closed publication handoff for the already-proved and locally-applied Project View Perfection candidate.

It performs a remote write only after all guards pass:

- checkout root must be the `kimhw8084/system_grid` repository on branch `main`;
- local base must be `d40c0929ff7a9ec37d9c57bdb7ef0cf2d020c7ee` (or a resumable one-commit child created by this publisher);
- remote `origin/main` must still be `d40c0929ff7a9ec37d9c57bdb7ef0cf2d020c7ee` before a new push;
- `SysGrid` must remain a first-class mode-160000 gitlink at `445c225a3dec7c359f8ff0b09934716ee2d91b6e`;
- the tracked change set must be exactly the eight verified candidate files;
- each file must match the exact Repair 7 PASS blob identity;
- no files outside that set are staged;
- publication is one normal fast-forward commit; force push is never used;
- remote `main` is re-read after push and must equal the new commit.

Untracked local evidence/executor directories are ignored and are never staged.

The publisher creates `SysGrid-Project-View-Perfection-Publish-RESULT.zip` in the repository root on PASS or FAIL.
