#!/usr/bin/env bash
set -e

PG_BIN="/usr/lib/postgresql/18/bin"
PGDATA="/home/ghost/Desktop/INVESTRA/backend/pgdata"
LOGFILE="$PGDATA/logfile"

# 1. Initialize cluster if not present
if [ ! -d "$PGDATA" ]; then
    echo "Initializing PostgreSQL cluster at $PGDATA..."
    "$PG_BIN/initdb" -D "$PGDATA" --auth-local=trust --auth-host=trust -U ghost
    # Configure socket and port
    echo "unix_socket_directories = '$PGDATA,/tmp'" >> "$PGDATA/postgresql.conf"
    echo "port = 5432" >> "$PGDATA/postgresql.conf"
    echo "listen_addresses = 'localhost'" >> "$PGDATA/postgresql.conf"
fi

# 2. Check if running, if not start it
if ! "$PG_BIN/pg_isready" -h localhost -p 5432 >/dev/null 2>&1; then
    echo "Starting PostgreSQL server..."
    "$PG_BIN/pg_ctl" -D "$PGDATA" -l "$LOGFILE" start
    sleep 2
fi

# 3. Create database if it doesn't exist
if ! "$PG_BIN/psql" -h localhost -p 5432 -U ghost -lqt | cut -d \| -f 1 | grep -qw investra_db; then
    echo "Creating investra_db..."
    "$PG_BIN/createdb" -h localhost -p 5432 -U ghost investra_db
    echo "Database investra_db created."
else
    echo "Database investra_db already exists."
fi

echo "PostgreSQL is ready and running for INVESTRA!"
