import os
import pytest
from unittest.mock import patch
from fastapi import HTTPException

os.environ.setdefault("JWT_SECRET", "test-secret-key-for-unit-tests")

from auth import hash_password, verify_password, generate_token, decode_token, require_roles


class TestPasswordHashing:
    def test_hash_password_returns_string(self):
        result = hash_password("mypassword")
        assert isinstance(result, str)

    def test_hash_password_is_not_plaintext(self):
        result = hash_password("mypassword")
        assert result != "mypassword"

    def test_verify_password_correct(self):
        hashed = hash_password("secret123")
        assert verify_password("secret123", hashed) is True

    def test_verify_password_wrong(self):
        hashed = hash_password("secret123")
        assert verify_password("wrong", hashed) is False

    def test_hash_same_password_produces_different_hashes(self):
        h1 = hash_password("same")
        h2 = hash_password("same")
        assert h1 != h2


class TestJWT:
    def test_generate_and_decode_token(self):
        user = {"id": 1, "email": "user@test.com", "role": "volunteer"}
        token = generate_token(user)
        payload = decode_token(token)
        assert payload["id"] == 1
        assert payload["email"] == "user@test.com"
        assert payload["role"] == "volunteer"

    def test_decode_invalid_token_raises_401(self):
        with pytest.raises(HTTPException) as exc:
            decode_token("not.a.valid.token")
        assert exc.value.status_code == 401

    def test_decode_tampered_token_raises_401(self):
        user = {"id": 1, "email": "user@test.com", "role": "volunteer"}
        token = generate_token(user)
        tampered = token[:-5] + "XXXXX"
        with pytest.raises(HTTPException) as exc:
            decode_token(tampered)
        assert exc.value.status_code == 401


class TestRequireRoles:
    def test_allowed_role_passes(self):
        dep = require_roles("supervisor", "org_admin")
        user = {"id": 1, "role": "supervisor"}
        result = dep(current_user=user)
        assert result == user

    def test_disallowed_role_raises_403(self):
        dep = require_roles("supervisor")
        user = {"id": 1, "role": "volunteer"}
        with pytest.raises(HTTPException) as exc:
            dep(current_user=user)
        assert exc.value.status_code == 403
