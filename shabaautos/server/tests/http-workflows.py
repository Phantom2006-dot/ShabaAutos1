#!/usr/bin/env python3
"""HTTP regression test for a local DEMO_MODE development server and disposable DB.

Run: PORT=4012 NODE_ENV=development DEMO_MODE=true USE_SQLITE=true
     DATABASE_PATH=/tmp/shaba-qa.db node dist/server.cjs
     python3 server/tests/http-workflows.py
Never run this against production: it creates and deletes local test records.
"""
import base64
import json
import os
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import date, timedelta

BASE = os.environ.get('SHABA_TEST_BASE', 'http://127.0.0.1:4012')
if not BASE.startswith(('http://127.0.0.1:', 'http://localhost:')):
    raise SystemExit('This mutation test only runs against localhost.')
ADMIN, STAFF, CUSTOMER = 'demo_token_admin', 'demo_token_staff', 'demo_token_customer'


def call(method, path, body=None, token=None, expected=200, multipart=False):
    headers = {}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    if multipart:
        boundary = f'qa{uuid.uuid4().hex}'
        png = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+fRx0AAAAASUVORK5CYII=')
        data = (f'--{boundary}\r\nContent-Disposition: form-data; name="images"; filename="qa.png"\r\nContent-Type: image/png\r\n\r\n').encode() + png + (f'\r\n--{boundary}--\r\n').encode()
        headers['Content-Type'] = f'multipart/form-data; boundary={boundary}'
    else:
        data = json.dumps(body).encode() if body is not None else None
        if body is not None:
            headers['Content-Type'] = 'application/json'
    request = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            status, payload = response.status, json.load(response)
    except urllib.error.HTTPError as error:
        status, payload = error.code, json.load(error)
    assert status == expected, (method, path, status, expected, payload)
    return payload


assert call('GET', '/api/health')['status'] == 'ok'
assert call('GET', '/api/ready')['status'] == 'ready'
call('GET', '/api/ops/vehicles', expected=401)
call('GET', '/api/ops/vehicles', token=ADMIN)
call('GET', '/api/ops/vehicles', token=STAFF)
stock = f'QA-{uuid.uuid4().hex[:8]}'
payload = {'make': 'Audit', 'model': 'Vehicle', 'year': 2023, 'priceNgn': 5000000, 'mileage': 40, 'stockId': stock, 'location': 'Lagos', 'description': 'Isolated regression test vehicle'}
vehicle_id = call('POST', '/api/ops/vehicles', payload, STAFF, 201)['data']['id']
search = lambda: call('GET', '/api/vehicles?' + urllib.parse.urlencode({'search': stock}))
assert not any(car['id'] == vehicle_id for car in search()['data'])
call('GET', f'/api/vehicles/{vehicle_id}', expected=404)
call('PATCH', f'/api/ops/vehicles/{vehicle_id}/approve', {}, STAFF, 403)
call('PATCH', f'/api/ops/vehicles/{vehicle_id}/approve', {}, ADMIN, 409)  # Require photo.
assert call('POST', f'/api/ops/vehicles/{vehicle_id}/images/upload', token=STAFF, expected=201, multipart=True)['success']
images = call('GET', f'/api/ops/vehicles/{vehicle_id}/images', token=STAFF)['data']
assert len(images) == 1 and images[0]['vehicleId'] == vehicle_id
call('PATCH', f'/api/ops/vehicles/not-this-vehicle/images/{images[0]["id"]}', {'caption': 'cross-record edit'}, STAFF, 404)
call('POST', f'/api/ops/vehicles/{vehicle_id}/images/reorder', {'order': [images[0]['id'], 'foreign']}, STAFF, 400)
call('PATCH', f'/api/ops/vehicles/{vehicle_id}/approve', {}, ADMIN)
assert any(car['id'] == vehicle_id for car in search()['data'])
assert call('GET', f'/api/vehicles/{vehicle_id}')['data']['id'] == vehicle_id
call('PATCH', f'/api/ops/vehicles/{vehicle_id}', {'priceNgn': 5500000}, STAFF)
assert not any(car['id'] == vehicle_id for car in search()['data'])  # Material edit enters review.
call('PATCH', f'/api/ops/vehicles/{vehicle_id}/approve', {}, ADMIN)
call('PATCH', f'/api/ops/vehicles/{vehicle_id}', {'status': 'sold'}, STAFF, 403)
call('PUT', '/api/ops/settings', {'settings': [{'settingKey': 'site.contact_email', 'settingValue': 'qa@example.com'}]}, STAFF, 403)
call('PUT', '/api/ops/settings', {'settings': [{'settingKey': 'site.contact_email', 'settingValue': 'qa@example.com'}]}, ADMIN)
assert call('GET', '/api/settings/public')['data']['site.contact_email']['value'] == 'qa@example.com'
call('PUT', '/api/ops/settings', {'settings': [{'settingKey': 'SECRET_KEY', 'settingValue': 'test'}]}, ADMIN, 400)
notifications = call('GET', '/api/ops/notifications', token=ADMIN)['data']
if notifications:
    notification_id = notifications[0]['id']
    call('PATCH', f'/api/ops/notifications/{notification_id}/read', {}, ADMIN)
    assert any(n['id'] == notification_id and n['status'] == 'read' for n in call('GET', '/api/ops/notifications', token=ADMIN)['data'])
rentals = call('GET', '/api/rentals/vehicles')['data']
if rentals:
    rental = next(car for car in rentals if car.get('available') and car.get('status') == 'active')
    pickup = (date.today() + timedelta(days=3)).isoformat()
    return_day = (date.today() + timedelta(days=5)).isoformat()
    base_booking = {'carId': rental['id'], 'pickupDate': pickup, 'returnDate': return_day, 'customerName': 'QA Customer', 'phone': '08031234567', 'pickupLocation': rental['location']}
    call('POST', '/api/rentals/book', {**base_booking, 'returnDate': pickup}, CUSTOMER, 400)
    booking = call('POST', '/api/rentals/book', {**base_booking, 'days': 999}, CUSTOMER, 201)['data']
    assert booking['days'] == 2 and booking['totalNgn'] == 2 * rental['pricePerDayNgn']
    call('PATCH', f'/api/ops/rentals/{booking["id"]}', {'status': 'Cancelled'}, STAFF)
    call('PATCH', f'/api/ops/rentals/{booking["id"]}', {'status': 'Active Reservation'}, STAFF, 409)
call('GET', '/api/tracking/NO-SUCH-ORDER', expected=401)
call('DELETE', f'/api/ops/vehicles/{vehicle_id}', token=STAFF, expected=403)
call('DELETE', f'/api/ops/vehicles/{vehicle_id}', token=ADMIN)
call('GET', f'/api/vehicles/{vehicle_id}', expected=404)
print('HTTP WORKFLOWS PASS: publication gate, media scope/upload, edit review, roles, settings, notification, rental dates/fees, tracking auth, deletion')
