$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$databaseRoot = Join-Path $projectRoot '.local-postgres'
$postgresBin = 'C:\Program Files\PostgreSQL\18\bin'
if (!(Test-Path (Join-Path $postgresBin 'pg_ctl.exe'))) { throw 'PostgreSQL 18 binaries were not found. Set postgresBin in scripts/start-database.ps1 to your PostgreSQL bin directory.' }
$envPath = Join-Path $projectRoot 'backend\.env'
if (!(Test-Path (Join-Path $databaseRoot 'PG_VERSION'))) {
  if (Test-Path $envPath) { throw 'An existing backend .env is configured. Use its database instead of initializing a new one.' }
  New-Item -ItemType Directory -Force -Path $databaseRoot | Out-Null
  $databasePassword = [Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N')
  $jwtSecret = [Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N')
  $passwordFile = Join-Path $projectRoot '.local-postgres-password'
  [IO.File]::WriteAllText($passwordFile, $databasePassword)
  try {
    & (Join-Path $postgresBin 'initdb.exe') -D $databaseRoot -U earth_forward --auth=scram-sha-256 --pwfile=$passwordFile --encoding=UTF8 --locale=C
    if ($LASTEXITCODE -ne 0) { throw 'Database initialization failed.' }
    $settings = @(
      "DATABASE_URL=postgresql://earth_forward:$databasePassword@127.0.0.1:5433/earth_forward?schema=public"
      "JWT_SECRET=$jwtSecret"
      'PORT=4000'
      'CLIENT_ORIGIN=http://127.0.0.1:5173,http://localhost:5173'
    )
    [IO.File]::WriteAllLines($envPath, $settings)
  } finally { if (Test-Path $passwordFile) { Remove-Item -LiteralPath $passwordFile } }
}
& (Join-Path $postgresBin 'pg_ctl.exe') -D $databaseRoot status
if ($LASTEXITCODE -ne 0) {
  $start = Start-Process -FilePath (Join-Path $postgresBin 'pg_ctl.exe') -ArgumentList '-D', ('"' + $databaseRoot + '"'), '-l', ('"' + (Join-Path $databaseRoot 'server.log') + '"'), '-o', '"-p 5433 -h 127.0.0.1"', '-w', 'start' -WindowStyle Hidden -PassThru
  if (!$start.WaitForExit(60000)) { throw 'Database startup timed out.' }
  if ($start.ExitCode -ne 0) { throw 'PostgreSQL failed to start. Check .local-postgres/server.log.' }
}
Write-Output 'Project PostgreSQL is running on 127.0.0.1:5433.'


$connectionLine = Get-Content $envPath | Where-Object { $_ -like 'DATABASE_URL=*' }
$connection = [Uri]($connectionLine.Substring(13).Trim('"'))
$previousPgPassword = $env:PGPASSWORD
$env:PGPASSWORD = $connection.UserInfo.Split(':')[1]
try {
  $exists = & (Join-Path $postgresBin 'psql.exe') -h 127.0.0.1 -p 5433 -U earth_forward -d postgres -At -c "SELECT 1 FROM pg_database WHERE datname='earth_forward'"
  if ($LASTEXITCODE -ne 0) { throw 'Could not connect to the project PostgreSQL cluster.' }
  if ($exists -ne '1') {
    & (Join-Path $postgresBin 'createdb.exe') -h 127.0.0.1 -p 5433 -U earth_forward earth_forward
    if ($LASTEXITCODE -ne 0) { throw 'Could not create the project database.' }
  }
} finally { $env:PGPASSWORD = $previousPgPassword }

