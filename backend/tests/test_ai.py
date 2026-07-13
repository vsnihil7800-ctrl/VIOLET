def test_ai_features(client):
    # 1. Register and login to obtain bearer access token
    client.post("/api/v1/auth/register", json={
        "email": "aiuser@example.com",
        "password": "aipassword123",
        "full_name": "AI Test User"
    })
    login_res = client.post("/api/v1/auth/login", data={
        "username": "aiuser@example.com",
        "password": "aipassword123"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Test portfolio rebalancing advisory summary
    portfolio_payload = {
        "total_value": 10000.0,
        "total_pl": 1200.0,
        "pl_percentage": 12.0,
        "allocation": [
            {"name": "stock", "value": 6000.0},
            {"name": "crypto", "value": 4000.0}
        ]
    }
    
    advice_response = client.post(
        "/api/v1/ai/summarize-portfolio",
        json=portfolio_payload,
        headers=headers
    )
    assert advice_response.status_code == 200
    advice_data = advice_response.json()
    assert "advisory_text" in advice_data
    assert "rebalance_score" in advice_data
    # Rebalance score drops due to high crypto concentration (>35%)
    assert advice_data["rebalance_score"] < 100
    
    # 3. Test receipt OCR scanner pre-fill mock matching filename
    files = {"file": ("starbucks_coffee.jpg", b"fake image bytes content")}
    receipt_response = client.post(
        "/api/v1/ai/scan-receipt",
        files=files,
        headers=headers
    )
    assert receipt_response.status_code == 200
    receipt_data = receipt_response.json()
    assert receipt_data["merchant"] == "Starbucks Coffee"
    assert receipt_data["category"] == "Food & Drinks"
    assert receipt_data["amount"] == 8.75
