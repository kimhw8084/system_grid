# FAR Direct Apply — Full Golden Recovery

This package bypasses `.sgcap` execution for the rapid development loop. It makes no commit, push, staging, or engine change.

## Apply

From anywhere inside the SysGrid repository:

```bash
/path/to/FAR_DIRECT_APPLY_FULL_GOLDEN_RECOVERY/APPLY_FAR_RECOVERY.command
```

Or pass the repository explicitly:

```bash
./APPLY_FAR_RECOVERY.command /path/to/SysGrid
```

The installer:

1. Locates the SysGrid repository.
2. Verifies exact reviewed preimage hashes.
3. Checks and applies the two-file patch.
4. Verifies exact postimage hashes.
5. Rolls back automatically if post-verification fails.

It preserves FAR's detailed risk-analysis capabilities while restoring Monitoring shell parity and non-displacing overlays.
