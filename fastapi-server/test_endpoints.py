#!/usr/bin/env python3
"""
Test script to check all FastAPI endpoints
Run this script while the FastAPI server is running
"""

import requests
import json
import sys
from typing import Dict, List

BASE_URL = "http://127.0.0.1:8000/"

# Colors for terminal output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def print_test(name: str):
    """Print test header"""
    print(f"\n{Colors.BLUE}{'='*60}{Colors.RESET}")
    print(f"{Colors.BOLD}Testing: {name}{Colors.RESET}")
    print(f"{Colors.BLUE}{'='*60}{Colors.RESET}")

def print_success(message: str):
    """Print success message"""
    try:
        print(f"{Colors.GREEN}[OK] {message}{Colors.RESET}")
    except UnicodeEncodeError:
        print(f"{Colors.GREEN}[OK] {message}{Colors.RESET}")

def print_error(message: str):
    """Print error message"""
    try:
        print(f"{Colors.RED}[ERROR] {message}{Colors.RESET}")
    except UnicodeEncodeError:
        print(f"{Colors.RED}[ERROR] {message}{Colors.RESET}")

def print_warning(message: str):
    """Print warning message"""
    try:
        print(f"{Colors.YELLOW}[WARN] {message}{Colors.RESET}")
    except UnicodeEncodeError:
        print(f"{Colors.YELLOW}[WARN] {message}{Colors.RESET}")

def print_info(message: str):
    """Print info message"""
    print(f"   {message}")

def test_endpoint(method: str, endpoint: str, data: dict = None, expected_status: int = 200) -> tuple[bool, dict]:
    """
    Test an endpoint
    Returns: (success: bool, response_data: dict)
    """
    url = f"{BASE_URL}{endpoint}"
    
    try:
        if method.upper() == "GET":
            response = requests.get(url, timeout=10)
        elif method.upper() == "POST":
            response = requests.post(url, json=data, timeout=10)
        else:
            return False, {"error": f"Unsupported method: {method}"}
        
        if response.status_code == expected_status:
            try:
                response_data = response.json()
                return True, response_data
            except json.JSONDecodeError:
                return True, {"text": response.text}
        else:
            return False, {
                "status_code": response.status_code,
                "error": response.text[:200]
            }
    
    except requests.exceptions.ConnectionError:
        return False, {"error": "Connection refused - Is the server running?"}
    except requests.exceptions.Timeout:
        return False, {"error": "Request timeout"}
    except Exception as e:
        return False, {"error": str(e)}

def test_websocket_endpoint(endpoint: str) -> bool:
    """Test WebSocket endpoint (basic connectivity check)"""
    try:
        import websockets
        import asyncio
        
        async def check_ws():
            uri = f"ws://localhost:8000{endpoint}"
            try:
                async with websockets.connect(uri, timeout=5) as websocket:
                    # Try to receive initial message
                    try:
                        message = await asyncio.wait_for(websocket.recv(), timeout=2)
                        return True
                    except asyncio.TimeoutError:
                        # Connection successful even if no message received
                        return True
            except Exception as e:
                return False
        
        return asyncio.run(check_ws())
    
    except ImportError:
        print_warning("websockets library not installed, skipping WebSocket test")
        print_info("Install with: pip install websockets")
        return None
    except Exception as e:
        return False

def main():
    """Run all endpoint tests"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}")
    print("="*60)
    print("FastAPI Endpoints Test Suite")
    print("="*60)
    print(f"{Colors.RESET}")
    print(f"Base URL: {BASE_URL}\n")
    
    results = {
        "passed": 0,
        "failed": 0,
        "warnings": 0
    }
    
    # Test 1: Root endpoint
    print_test("Root Endpoint (/)")
    success, data = test_endpoint("GET", "/")
    if success:
        print_success(f"Root endpoint is accessible")
        print_info(f"Version: {data.get('version', 'N/A')}")
        print_info(f"Message: {data.get('message', 'N/A')}")
        results["passed"] += 1
    else:
        print_error(f"Root endpoint failed: {data.get('error', 'Unknown error')}")
        results["failed"] += 1
        if "Connection refused" in str(data.get('error', '')):
            print_error("\n⚠️  SERVER NOT RUNNING!")
            print_info("Start the server with: python run.py")
            sys.exit(1)
    
    # Test 2: Health check
    print_test("Health Check (/api/health)")
    success, data = test_endpoint("GET", "/api/health")
    if success:
        print_success("Health check passed")
        print_info(f"Status: {data.get('status', 'N/A')}")
        print_info(f"Timestamp: {data.get('timestamp', 'N/A')}")
        connections = data.get('connections', {})
        print_info(f"WebSocket connections: T:{connections.get('telemetry', 0)} E:{connections.get('endurance', 0)} L:{connections.get('leaderboard', 0)}")
        results["passed"] += 1
    else:
        print_error(f"Health check failed: {data.get('error', 'Unknown error')}")
        results["failed"] += 1
    
    # Test 3: Telemetry endpoint
    print_test("Telemetry Endpoint (/api/telemetry)")
    success, data = test_endpoint("GET", "/api/telemetry")
    if success:
        if data.get("message"):
            print_warning("No telemetry data available yet (this is OK if server just started)")
        else:
            print_success("Telemetry endpoint accessible")
            print_info(f"Has telemetry data: {bool(data.get('vehicles'))}")
        results["passed"] += 1
    else:
        print_error(f"Telemetry endpoint failed: {data.get('error', 'Unknown error')}")
        results["failed"] += 1
    
    # Test 4: Endurance endpoint
    print_test("Endurance Endpoint (/api/endurance)")
    success, data = test_endpoint("GET", "/api/endurance")
    if success:
        count = data.get('count', 0)
        if count == 0:
            print_warning("No endurance data available yet (this is OK if broadcast loop hasn't started)")
        else:
            print_success(f"Endurance endpoint accessible ({count} events)")
        results["passed"] += 1
    else:
        print_error(f"Endurance endpoint failed: {data.get('error', 'Unknown error')}")
        results["failed"] += 1
    
    # Test 5: Leaderboard endpoint
    print_test("Leaderboard Endpoint (/api/leaderboard)")
    success, data = test_endpoint("GET", "/api/leaderboard")
    if success:
        count = data.get('count', 0)
        if count == 0:
            print_warning("No leaderboard data available yet (this is OK if broadcast loop hasn't started)")
        else:
            print_success(f"Leaderboard endpoint accessible ({count} entries)")
        results["passed"] += 1
    else:
        print_error(f"Leaderboard endpoint failed: {data.get('error', 'Unknown error')}")
        results["failed"] += 1
    
    # Test 6: Control endpoint
    print_test("Control Endpoint (/api/control)")
    test_command = {"cmd": "play"}
    success, data = test_endpoint("POST", "/api/control", data=test_command)
    if success:
        print_success("Control endpoint accessible")
        print_info(f"Command sent: {data.get('command', 'N/A')}")
        print_info(f"Status: {data.get('status', 'N/A')}")
        results["passed"] += 1
    else:
        print_error(f"Control endpoint failed: {data.get('error', 'Unknown error')}")
        results["failed"] += 1
    
    # Test 7: Preprocess endpoint (may take time)
    print_test("Preprocess Endpoint (/api/preprocess)")
    print_info("Note: This endpoint may return an error if input files are missing")
    success, data = test_endpoint("POST", "/api/preprocess", data={})
    if success:
        if data.get('status') == 'error':
            print_warning(f"Preprocess endpoint accessible but returned error: {data.get('message', 'N/A')}")
            print_info("This is OK if input CSV files are not found")
            results["warnings"] += 1
        else:
            print_success("Preprocess endpoint accessible")
        results["passed"] += 1
    else:
        print_error(f"Preprocess endpoint failed: {data.get('error', 'Unknown error')}")
        results["failed"] += 1
    
    # Test 8: SSE endpoints (check if accessible)
    print_test("SSE Endpoints (Server-Sent Events)")
    sse_endpoints = ["/sse/telemetry", "/sse/endurance", "/sse/leaderboard"]
    for endpoint in sse_endpoints:
        success, data = test_endpoint("GET", endpoint)
        if success:
            # SSE endpoints return streaming response, so 200 is expected
            print_success(f"{endpoint} is accessible")
            results["passed"] += 1
        else:
            print_error(f"{endpoint} failed: {data.get('error', 'Unknown error')}")
            results["failed"] += 1
    
    # Test 9: WebSocket endpoints
    print_test("WebSocket Endpoints")
    ws_endpoints = ["/ws/telemetry", "/ws/endurance", "/ws/leaderboard"]
    for endpoint in ws_endpoints:
        result = test_websocket_endpoint(endpoint)
        if result is True:
            print_success(f"{endpoint} WebSocket connection successful")
            results["passed"] += 1
        elif result is False:
            print_error(f"{endpoint} WebSocket connection failed")
            results["failed"] += 1
        else:
            print_warning(f"{endpoint} WebSocket test skipped (websockets library not installed)")
            results["warnings"] += 1
    
    # Test 10: API Documentation
    print_test("API Documentation (/docs)")
    success, data = test_endpoint("GET", "/docs", expected_status=200)
    if success:
        print_success("API documentation accessible at /docs")
        print_info("Visit http://127.0.0.1:8000//docs in your browser")
        results["passed"] += 1
    else:
        print_warning("API documentation endpoint returned unexpected status")
        results["warnings"] += 1
    
    # Summary
    print(f"\n{Colors.BOLD}{Colors.BLUE}")
    print("="*60)
    print("Test Summary")
    print("="*60)
    print(f"{Colors.RESET}")
    print(f"{Colors.GREEN}✅ Passed: {results['passed']}{Colors.RESET}")
    if results["warnings"] > 0:
        print(f"{Colors.YELLOW}⚠️  Warnings: {results['warnings']}{Colors.RESET}")
    if results["failed"] > 0:
        print(f"{Colors.RED}❌ Failed: {results['failed']}{Colors.RESET}")
    
    total = results["passed"] + results["failed"]
    if total > 0:
        success_rate = (results["passed"] / total) * 100
        print(f"\nSuccess Rate: {success_rate:.1f}%")
    
    if results["failed"] == 0:
        print(f"\n{Colors.GREEN}{Colors.BOLD}[SUCCESS] All critical endpoints are working!{Colors.RESET}")
        return 0
    else:
        print(f"\n{Colors.RED}{Colors.BOLD}[WARNING] Some endpoints have issues. Check the errors above.{Colors.RESET}")
        return 1

if __name__ == "__main__":
    try:
        exit_code = main()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}Test interrupted by user{Colors.RESET}")
        sys.exit(1)

