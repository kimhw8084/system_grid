import requests

url = "http://127.0.0.1:8000/api/v1/devices"
headers = {"X-User-Id": "haewon.kim"}
data = {"name": "TEST-DEVICE", "system": "TEST"}

response = requests.post(url, headers=headers, json=data)
print(f"Status: {response.status_code}")
print(f"Body: {response.text}")
