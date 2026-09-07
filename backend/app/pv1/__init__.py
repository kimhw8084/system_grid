"""PV1 domain foundation.

The PV1 tables are additive and own the v2 API. Legacy Project/Task rows remain
readable through explicit compatibility adapters; v2 writes never update the
legacy JSON document as an independent source of truth.
"""

