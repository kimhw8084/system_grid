"""Canonical PV1 Architecture domain.

The legacy data-flow document remains available through its v1 compatibility
adapter.  These models are the only writable Architecture authority used by
the v2 API and by both Architecture hosts.
"""

from . import models

__all__ = ["models"]
