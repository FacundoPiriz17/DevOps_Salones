"""Contract tests for strict TLS, the bounded laboratory exception, and API identity."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


SCRIPT = Path(os.environ.get('PUBLIC_CHECK_SCRIPT', Path(__file__).resolve().parents[1] / 'verify-public.sh'))
PIN = 'sha256//' + 'A' * 43 + '='
API = 'API de Gestión de Salas UCU · Proyecto DevOps'


class PublicCheckTest(unittest.TestCase):
    def run_check(self, *, policy='strict', host='salones-team9.reto-ucu.net', pin=PIN,
                  strict_status=60, pinned_status=0, body=API):
        with tempfile.TemporaryDirectory() as temporary:
            folder = Path(temporary)
            curl = folder / 'curl'
            curl.write_text('#!' + sys.executable + '\n' + '''
import json, os, sys
args = sys.argv[1:]
with open(os.environ['CURL_CALLS'], 'a') as output:
    output.write(json.dumps(args) + '\\n')
pinned = '--insecure' in args
status = int(os.environ['PINNED_STATUS' if pinned else 'STRICT_STATUS'])
if not status:
    print(os.environ['API_BODY'])
sys.exit(status)
''', encoding='utf-8')
            curl.chmod(0o755)
            reports = folder / 'reports'
            calls = folder / 'calls.jsonl'
            environment = {**os.environ, 'PATH': str(folder) + os.pathsep + os.environ['PATH'],
                           'APP_SCHEME': 'https', 'APP_HOST': host, 'PUBLIC_TLS_POLICY': policy,
                           'LAB_TLS_PUBLIC_KEY_PIN': pin, 'PUBLIC_REPORTS_DIR': str(reports),
                           'CURL_CALLS': str(calls), 'STRICT_STATUS': str(strict_status),
                           'PINNED_STATUS': str(pinned_status), 'API_BODY': body}
            result = subprocess.run(['sh', str(SCRIPT)], env=environment, capture_output=True, text=True)
            requests = [json.loads(line) for line in calls.read_text().splitlines()] if calls.exists() else []
            files = {file.name: file.read_text() for file in reports.glob('*')}
            return result, requests, files

    def test_strict_mode_never_ignores_an_invalid_certificate(self):
        result, requests, files = self.run_check()
        self.assertEqual(result.returncode, 60)
        self.assertEqual(len(requests), 1)
        self.assertNotIn('--insecure', requests[0])
        self.assertNotIn('deployment-url.txt', files)

    def test_valid_certificate_uses_normal_validation_even_with_lab_policy(self):
        result, requests, files = self.run_check(policy='pinned-lab', strict_status=0)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(len(requests), 1)
        self.assertNotIn('--insecure', requests[0])
        self.assertNotIn('public-tls-warning.txt', files)

    def test_lab_exception_requires_pin_and_reports_its_use(self):
        result, requests, files = self.run_check(policy='pinned-lab')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(len(requests), 2)
        self.assertIn('--insecure', requests[1])
        self.assertEqual(requests[1][requests[1].index('--pinnedpubkey') + 1], PIN)
        self.assertIn('public-tls-warning.txt', files)
        self.assertEqual(files['deployment-url.txt'].strip(), 'https://salones-team9.reto-ucu.net')

    def test_exception_does_not_apply_to_other_hosts(self):
        result, requests, _ = self.run_check(policy='pinned-lab', host='otro.example.com')
        self.assertEqual(result.returncode, 60)
        self.assertEqual(len(requests), 1)

    def test_empty_pin_cannot_enable_exception(self):
        result, requests, _ = self.run_check(policy='pinned-lab', pin='')
        self.assertEqual(result.returncode, 2)
        self.assertEqual(len(requests), 1)

    def test_changed_key_is_rejected(self):
        result, _, files = self.run_check(policy='pinned-lab', pinned_status=90)
        self.assertEqual(result.returncode, 90)
        self.assertNotIn('deployment-url.txt', files)

    def test_another_application_cannot_pass(self):
        result, _, files = self.run_check(strict_status=0, body='<html>Coro UCU</html>')
        self.assertEqual(result.returncode, 1)
        self.assertNotIn('deployment-url.txt', files)


if __name__ == '__main__':
    unittest.main()
