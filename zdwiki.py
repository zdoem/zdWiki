#!/usr/bin/env python3
import sys
from pathlib import Path

# Add apps/api to Python path
api_path = Path(__file__).resolve().parent / "apps" / "api"
if str(api_path) not in sys.path:
    sys.path.insert(0, str(api_path))

from app.cli.main import cli_app

if __name__ == "__main__":
    cli_app()
