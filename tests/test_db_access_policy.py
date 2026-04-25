"""
Static policy check — fails if any source file outside database.py uses
sqlite3.connect( directly.

All database access must go through database.get_db() / get_connection() so
the path guard in database.py applies and no stray .db files can be created.

Run standalone:
    python tests/test_db_access_policy.py
"""

import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ALLOWED_FILES = {
    os.path.normcase(os.path.join(ROOT, "backend-python", "database.py")),
    os.path.normcase(os.path.abspath(__file__)),  # this scanner itself mentions the pattern
}
EXCLUDE_DIRS = {
    "node_modules", ".venv", "__pycache__", ".git", "dist", "build",
}
PATTERN = re.compile(r"\bsqlite3\.connect\s*\(")


def find_violations():
    violations = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for fn in filenames:
            if not fn.endswith(".py"):
                continue
            path = os.path.join(dirpath, fn)
            if os.path.normcase(os.path.abspath(path)) in ALLOWED_FILES:
                continue
            try:
                with open(path, "r", encoding="utf-8") as f:
                    for lineno, line in enumerate(f, 1):
                        if PATTERN.search(line):
                            violations.append((path, lineno, line.rstrip()))
            except (OSError, UnicodeDecodeError):
                continue
    return violations


def main():
    violations = find_violations()
    if violations:
        print("FAIL: direct sqlite3.connect( usage found outside database.py:")
        for path, lineno, line in violations:
            rel = os.path.relpath(path, ROOT)
            print(f"  {rel}:{lineno}: {line}")
        print()
        print("Use database.get_db() or database.get_connection() instead.")
        sys.exit(1)
    print("PASS: no direct sqlite3.connect( usage outside database.py")


if __name__ == "__main__":
    main()
