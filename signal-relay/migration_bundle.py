"""Private offline device-state bundle. Never print credentials or archive entries.

Pack only while the isolated client is stopped. Restore only into an empty private
runtime volume, never a source tree, image layer or public directory.
"""
from pathlib import Path, PurePosixPath
from datetime import datetime, timezone
import argparse, hashlib, io, json, os, subprocess, tarfile

WORK = Path(__file__).resolve().parent
PRIVATE = WORK / 'private'
ARCHIVE = PRIVATE / 'signal-device-migration.tar.gz'

def digest(data):
    return hashlib.sha256(data).hexdigest()

def pack():
    if os.name != 'nt':
        raise ValueError('Pack is restricted to the original isolated Windows owner')
    process_check = subprocess.run(['powershell', '-NoProfile', '-Command',
        "@(Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'java.exe' -and $_.CommandLine -like '*signal-work*private*state*' }).Count"],
        capture_output=True, text=True, timeout=15, creationflags=subprocess.CREATE_NO_WINDOW)
    if process_check.returncode or process_check.stdout.strip() != '0':
        raise ValueError('Isolated device process may be running')
    status = json.loads((PRIVATE / 'link-status.json').read_text(encoding='utf-8'))
    target = json.loads((PRIVATE / 'target-group.json').read_text(encoding='utf-8'))
    if status.get('status') != 'connected' or not target.get('groupIdVerified'):
        raise ValueError('Not verified')
    if (PRIVATE / 'link.lock').exists() or ARCHIVE.exists():
        raise ValueError('Active request or existing archive')
    payload = {}
    state = PRIVATE / 'state'
    for p in (state / 'data').rglob('*'):
        if p.is_symlink():
            raise ValueError('Unexpected symlink')
        if not p.is_file():
            continue
        # Message cache and downloaded content are not needed for device identity.
        if 'msg-cache' in p.relative_to(state).parts:
            raise ValueError('Unexpected message cache; review before migration')
        payload[p.relative_to(state).as_posix()] = p.read_bytes()
    if 'data/accounts.json' not in payload or not any(k.endswith('/account.db') for k in payload):
        raise ValueError('Missing device state')
    payload['target-group.json'] = (PRIVATE / 'target-group.json').read_bytes()
    manifest = {'schema': 1, 'signalCliVersion': '0.14.9',
                'createdAt': datetime.now(timezone.utc).isoformat(),
                'files': {k: {'bytes': len(v), 'sha256': digest(v)} for k, v in payload.items()},
                'excluded': ['avatars', 'attachments', 'stickers', 'msg-cache'],
                'containsDeviceSecrets': True, 'sendingEnabled': False}
    payload['bundle-manifest.json'] = json.dumps(manifest, indent=2).encode('utf-8')
    try:
        with ARCHIVE.open('xb') as destination:
            with tarfile.open(fileobj=destination, mode='w:gz') as archive:
                for name, data in payload.items():
                    info = tarfile.TarInfo(name)
                    info.size = len(data); info.mode = 0o600
                    archive.addfile(info, io.BytesIO(data))
    except Exception:
        ARCHIVE.unlink(missing_ok=True)
        raise
    safe = {'archiveBytes': ARCHIVE.stat().st_size, 'sha256': digest(ARCHIVE.read_bytes()),
            'fileCount': len(payload), 'signalCliVersion': '0.14.9',
            'deviceSecretsPrivateOnly': True, 'localClientMustStayStopped': True}
    (PRIVATE / 'migration-summary.json').write_text(json.dumps(safe, indent=2), encoding='utf-8')
    (PRIVATE / 'migration-freeze.json').write_text(json.dumps({'localClientFrozen': True,
        'reason': 'Device state handed off for single-instance cloud validation',
        'createdAt': manifest['createdAt']}), encoding='utf-8')
    print(json.dumps(safe))

def unpack(source, destination=None, expected_sha256=None):
    source = Path(source)
    if expected_sha256 and digest(source.read_bytes()) != expected_sha256.lower():
        raise ValueError('Archive checksum mismatch')
    payload = {}
    with tarfile.open(source, 'r:gz') as archive:
        for member in archive:
            path = PurePosixPath(member.name)
            if (not member.isfile() or path.is_absolute() or '..' in path.parts
                    or '\\' in member.name or ':' in member.name or member.name in payload
                    or member.size > 32 * 1024 * 1024):
                raise ValueError('Unsafe archive')
            if path.parts[0] not in {'data', 'target-group.json', 'bundle-manifest.json'}:
                raise ValueError('Unexpected archive entry')
            if sum(map(len, payload.values())) + member.size > 64 * 1024 * 1024:
                raise ValueError('Archive exceeds private-state limit')
            payload[member.name] = archive.extractfile(member).read()
    manifest = json.loads(payload.pop('bundle-manifest.json'))
    if manifest['schema'] != 1 or manifest['signalCliVersion'] != '0.14.9':
        raise ValueError('Unsupported state version')
    if set(manifest['files']) != set(payload):
        raise ValueError('Manifest mismatch')
    for name, data in payload.items():
        if manifest['files'][name] != {'bytes': len(data), 'sha256': digest(data)}:
            raise ValueError('Payload mismatch')
    if destination:
        destination = Path(destination)
        if not destination.is_dir() or destination.is_symlink() or any(destination.iterdir()):
            raise ValueError('Destination must be an existing empty private runtime directory')
        os.chmod(destination, 0o700)
        for name, data in payload.items():
            output = destination.joinpath(*PurePosixPath(name).parts)
            current = destination
            for part in PurePosixPath(name).parts[:-1]:
                current = current / part
                current.mkdir(mode=0o700, exist_ok=True)
            with output.open('xb') as handle:
                handle.write(data)
            os.chmod(output, 0o600)
    print(json.dumps({'verified': True, 'restored': bool(destination),
                      'fileCount': len(payload), 'signalCliVersion': '0.14.9',
                      'sensitiveValuesPrinted': False}))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['pack', 'verify', 'restore'])
    parser.add_argument('--archive', default=str(ARCHIVE))
    parser.add_argument('--destination')
    parser.add_argument('--sha256')
    args = parser.parse_args()
    try:
        if args.action == 'pack':
            pack()
        elif args.action == 'verify':
            unpack(args.archive, expected_sha256=args.sha256)
        elif args.destination:
            unpack(args.archive, args.destination, args.sha256)
        else:
            raise ValueError('Private runtime destination required')
    except Exception as error:
        print(json.dumps({'ok': False, 'errorCategory': type(error).__name__,
                          'detailsSuppressed': True}))
        raise SystemExit(1)
