import os
import pytest
from unittest.mock import MagicMock
from fastapi import HTTPException

os.environ.setdefault("JWT_SECRET", "test-secret-key-for-unit-tests")

from auth import get_org_for_admin


class TestGetOrgForAdmin:
    def _make_db(self, org_row):
        db = MagicMock()
        cursor = MagicMock()
        cursor.fetchone.return_value = org_row
        db.execute.return_value = cursor
        return db

    def test_returns_org_dict_when_found(self):
        org_row = {"id": 5, "name": "Test Org", "status": "approved",
                   "tracks_hours": True, "admin_user_id": 3}
        db = self._make_db(org_row)
        result = get_org_for_admin(db, user_id=3)
        assert result["id"] == 5
        assert result["name"] == "Test Org"

    def test_raises_403_when_no_org_found(self):
        db = self._make_db(None)
        with pytest.raises(HTTPException) as exc:
            get_org_for_admin(db, user_id=99)
        assert exc.value.status_code == 403

    def test_result_is_plain_dict(self):
        org_row = {"id": 5, "name": "Test Org", "status": "approved",
                   "tracks_hours": False, "admin_user_id": 3}
        db = self._make_db(org_row)
        result = get_org_for_admin(db, user_id=3)
        assert isinstance(result, dict)


class TestOrganizationStatusValues:
    VALID_STATUSES = {"pending", "approved", "rejected"}

    def test_approved_is_valid(self):
        assert "approved" in self.VALID_STATUSES

    def test_unknown_status_not_valid(self):
        assert "active" not in self.VALID_STATUSES
