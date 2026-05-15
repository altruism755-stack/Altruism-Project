import os
import pytest
from unittest.mock import MagicMock, patch

os.environ.setdefault("JWT_SECRET", "test-secret-key-for-unit-tests")
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost/test")


@pytest.fixture
def mock_db():
    db = MagicMock()
    db.__enter__ = MagicMock(return_value=db)
    db.__exit__ = MagicMock(return_value=False)
    return db


@pytest.fixture
def volunteer_user():
    return {"id": 1, "email": "volunteer@test.com", "role": "volunteer"}


@pytest.fixture
def supervisor_user():
    return {"id": 2, "email": "supervisor@test.com", "role": "supervisor"}


@pytest.fixture
def org_admin_user():
    return {"id": 3, "email": "orgadmin@test.com", "role": "org_admin"}


@pytest.fixture
def platform_admin_user():
    return {"id": 4, "email": "platform@test.com", "role": "platform_admin"}
