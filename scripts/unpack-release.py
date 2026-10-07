"""Verify the actual ZIP and extract a fresh source consumer outside the checkout."""
import argparse,hashlib,json,stat,subprocess,zipfile
from pathlib import Path,PurePosixPath
ROOT=Path(__file__).resolve().parent.parent
p=argparse.ArgumentParser()
p.add_argument('--out',required=True)
p.add_argument('--archive')
args=p.parse_args()
version=json.loads((ROOT/'package.json').read_text(encoding='utf-8'))['version']
archive=Path(args.archive).resolve() if args.archive else ROOT/'release-artifacts'/f'prism_{version}_source.zip'
checksum=hashlib.sha256(archive.read_bytes()).hexdigest()+'  '+archive.name+'\n'
if archive.with_name(archive.name+'.sha256').read_text(encoding='utf-8')!=checksum or checksum not in (archive.parent/'SHA256SUMS').read_text(encoding='utf-8').splitlines(keepends=True):raise ValueError('Source checksums differ')
destination=Path(args.out).resolve()
if destination.exists() or destination.is_relative_to(ROOT):raise ValueError('Use a new folder outside the checkout')
tracked=subprocess.check_output(['git','ls-files','-z'],cwd=ROOT).decode().split('\0')[:-1]
prefix=f'prism-{version}/'
with zipfile.ZipFile(archive) as package:
    names=package.namelist()
    if len(names)!=len(set(names)) or package.testzip() is not None:raise ValueError('ZIP duplicate/CRC failure')
    files={}
    for entry in package.infolist():
        if not entry.filename.startswith(prefix):raise ValueError('ZIP prefix differs')
        name=entry.filename[len(prefix):]
        path=PurePosixPath(name)
        if path.is_absolute() or '..' in path.parts or '\\' in name or ':' in name:raise ValueError('Unsafe ZIP path')
        if any(part in {'.git','node_modules','dist','.wrangler','reports','release-artifacts'} or part.startswith('.env') for part in path.parts):raise ValueError('Private/build ZIP entry')
        mode=stat.S_IFMT(entry.external_attr>>16)
        if mode not in {0,stat.S_IFREG,stat.S_IFDIR}:raise ValueError('Linked/special ZIP entry')
        if not entry.is_dir():files[name]=package.read(entry)
    if set(files)!=set(tracked):raise ValueError('ZIP differs from tracked source set')
    for name,data in files.items():
        if data!=(ROOT/name).read_bytes():raise ValueError('ZIP source bytes differ: '+name)
    for name in ['LICENSE','README.md','pnpm-lock.yaml','docs/STABILITY.md','SECURITY.md']:
        if name not in files:raise ValueError('Missing release guide/license/lockfile')
    if json.loads(files['package.json'])['license']!='MIT':raise ValueError('Release license metadata differs')
    companion=archive.parent/f'prism_{version}_companion.zip'
    if companion.read_bytes()!=files['public/prism-webmcp-companion.zip']:raise ValueError('Companion release differs from source download')
    companionChecksum=hashlib.sha256(companion.read_bytes()).hexdigest()+'  '+companion.name+'\n'
    if companion.with_name(companion.name+'.sha256').read_text(encoding='utf-8')!=companionChecksum or (archive.parent/'SHA256SUMS').read_text(encoding='utf-8')!=checksum+companionChecksum:raise ValueError('Companion checksums differ')
    import io
    with zipfile.ZipFile(io.BytesIO(companion.read_bytes())) as extension:
        expected=['LICENSE','PRIVACY.md','README.md','lib.js','manifest.json','popup.css','popup.html','popup.js']
        if sorted(extension.namelist())!=sorted(expected) or extension.testzip() is not None:raise ValueError('Companion archive entries differ')
        for name in expected:
            if extension.read(name)!=files['extension/'+name]:raise ValueError('Companion source bytes differ: '+name)
        if json.loads(extension.read('manifest.json'))['version']!=version:raise ValueError('Companion version differs')
    destination.mkdir(parents=True)
    for name,data in files.items():
        target=destination/name
        target.parent.mkdir(parents=True,exist_ok=True)
        target.write_bytes(data)
print(json.dumps({'archive':archive.name,'sha256':checksum.split()[0],'version':version,'sourceFiles':len(files),'sourceBytes':'match','license':'MIT','consumer':str(destination)}))
