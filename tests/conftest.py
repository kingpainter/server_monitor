"""Pytest configuration for Server Monitor tests."""

import sys
from pathlib import Path

# Add custom_components to path so we can import server_monitor
sys.path.insert(0, str(Path(__file__).parent.parent / "custom_components"))
