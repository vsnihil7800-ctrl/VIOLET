def test_register_and_login_flow(client):
    # 1. Register new user
    register_payload = {
        "email": "testuser@example.com",
        "password": "strongsecurepassword123",
        "full_name": "Test User Account"
    }
    
    reg_response = client.post("/api/v1/auth/register", json=register_payload)
    assert reg_response.status_code == 201
    reg_data = reg_response.json()
    assert reg_data["email"] == "testuser@example.com"
    assert "id" in reg_data
    
    # 2. Prevent duplicate registrations
    duplicate_response = client.post("/api/v1/auth/register", json=register_payload)
    assert duplicate_response.status_code == 400
    assert "already exists" in duplicate_response.json()["detail"].lower()
    
    # 3. Successful login
    login_payload = {
        "username": "testuser@example.com",
        "password": "strongsecurepassword123"
    }
    
    login_response = client.post("/api/v1/auth/login", data=login_payload)
    assert login_response.status_code == 200
    login_data = login_response.json()
    assert "access_token" in login_data
    assert "refresh_token" in login_data
    assert login_data["token_type"] == "bearer"
    
    # 4. Failed login due to bad password
    bad_login_payload = {
        "username": "testuser@example.com",
        "password": "wrongpasswordhere"
    }
    
    bad_login_response = client.post("/api/v1/auth/login", data=bad_login_payload)
    assert bad_login_response.status_code == 400
    assert "incorrect email or password" in bad_login_response.json()["detail"].lower()
