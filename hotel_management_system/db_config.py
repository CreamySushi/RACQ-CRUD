import os
import sqlite3
from pathlib import Path
from urllib.parse import quote, unquote

import psycopg
from dotenv import load_dotenv

load_dotenv()

_SCHEMA_READY = False
_DB_DIALECT = None


class SQLiteCursorCompat:
    """Small adapter to support MySQL-style %s placeholders with sqlite3."""

    def __init__(self, cursor: sqlite3.Cursor):
        self._cursor = cursor

    def execute(self, query, params=None):
        normalized = query.replace("%s", "?")
        if params is None:
            return self._cursor.execute(normalized)
        return self._cursor.execute(normalized, params)

    def executemany(self, query, seq_of_params):
        normalized = query.replace("%s", "?")
        return self._cursor.executemany(normalized, seq_of_params)

    def __getattr__(self, name):
        return getattr(self._cursor, name)


class SQLiteConnectionCompat:
    def __init__(self, connection: sqlite3.Connection):
        self._connection = connection

    def cursor(self):
        return SQLiteCursorCompat(self._connection.cursor())

    def __getattr__(self, name):
        return getattr(self._connection, name)


def _normalize_database_url(url: str) -> str:
    # Supabase/Neon sometimes provide postgres://; psycopg expects postgresql://.
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://") :]

    # Normalize password encoding to handle common copy/paste mistakes.
    if "://" in url:
        scheme, rest = url.split("://", 1)

        if "@" in rest:
            auth, host_part = rest.rsplit("@", 1)
            if ":" in auth:
                user, raw_password = auth.split(":", 1)
                raw_password = raw_password.strip()

                # Some users paste passwords wrapped in [] from examples.
                if raw_password.startswith("[") and raw_password.endswith("]"):
                    raw_password = raw_password[1:-1]

                encoded_password = quote(unquote(raw_password), safe="")
                rest = f"{user}:{encoded_password}@{host_part}"
                url = f"{scheme}://{rest}"

    # Supabase requires SSL.
    if "sslmode=" not in url:
        url = f"{url}{'&' if '?' in url else '?'}sslmode=require"

    return url


def _migrate_legacy_postgres_schema(cur):
    # Compatibility with older schema files that used generic column names.
    cur.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = 'id'
            )
            AND NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = 'user_id'
            ) THEN
                ALTER TABLE users RENAME COLUMN id TO user_id;
            END IF;

            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'rooms' AND column_name = 'id'
            )
            AND NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'rooms' AND column_name = 'room_id'
            ) THEN
                ALTER TABLE rooms RENAME COLUMN id TO room_id;
            END IF;

            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'rooms' AND column_name = 'price'
            )
            AND NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'rooms' AND column_name = 'amount'
            ) THEN
                ALTER TABLE rooms RENAME COLUMN price TO amount;
            END IF;
        END $$;
        """
    )


def _bootstrap_schema_sqlite(conn: sqlite3.Connection):
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            surname TEXT,
            firstname TEXT,
            username TEXT,
            email TEXT UNIQUE,
            phone TEXT,
            password_hash TEXT,
            role TEXT DEFAULT 'customer'
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS rooms (
            room_id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_number TEXT,
            room_type TEXT,
            amount REAL,
            status TEXT DEFAULT 'available'
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER,
            room_id INTEGER,
            checkin_date TEXT,
            checkout_date TEXT,
            total_amount REAL,
            registered_name TEXT,
            status TEXT DEFAULT 'upcoming',
            FOREIGN KEY (customer_id) REFERENCES users(user_id),
            FOREIGN KEY (room_id) REFERENCES rooms(room_id)
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS checkout_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            registered_name TEXT,
            customer_id INTEGER,
            room_id INTEGER,
            checkin_date TEXT,
            checkout_date TEXT,
            total_amount REAL,
            status TEXT DEFAULT 'expired'
        )
        """
    )

    conn.commit()


def _bootstrap_schema_postgres(conn):
    cur = conn.cursor()

    _migrate_legacy_postgres_schema(cur)

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            user_id SERIAL PRIMARY KEY,
            surname TEXT,
            firstname TEXT,
            username TEXT,
            email TEXT UNIQUE,
            phone TEXT,
            password_hash TEXT,
            role TEXT DEFAULT 'customer'
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS rooms (
            room_id SERIAL PRIMARY KEY,
            room_number TEXT,
            room_type TEXT,
            amount NUMERIC(10, 2),
            status TEXT DEFAULT 'available'
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS bookings (
            id SERIAL PRIMARY KEY,
            customer_id INTEGER,
            room_id INTEGER,
            checkin_date DATE,
            checkout_date DATE,
            total_amount NUMERIC(10, 2),
            registered_name TEXT,
            status TEXT DEFAULT 'upcoming',
            FOREIGN KEY (customer_id) REFERENCES users(user_id),
            FOREIGN KEY (room_id) REFERENCES rooms(room_id)
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS checkout_history (
            id SERIAL PRIMARY KEY,
            registered_name TEXT,
            customer_id INTEGER,
            room_id INTEGER,
            checkin_date DATE,
            checkout_date DATE,
            total_amount NUMERIC(10, 2),
            status TEXT DEFAULT 'expired'
        )
        """
    )

    # Ensure expected columns exist even on partially created tables.
    cur.execute("ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS surname TEXT")
    cur.execute("ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS firstname TEXT")
    cur.execute("ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS username TEXT")
    cur.execute("ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS email TEXT")
    cur.execute("ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS phone TEXT")
    cur.execute("ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS password_hash TEXT")
    cur.execute("ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'customer'")

    cur.execute("ALTER TABLE IF EXISTS rooms ADD COLUMN IF NOT EXISTS room_number TEXT")
    cur.execute("ALTER TABLE IF EXISTS rooms ADD COLUMN IF NOT EXISTS room_type TEXT")
    cur.execute("ALTER TABLE IF EXISTS rooms ADD COLUMN IF NOT EXISTS amount NUMERIC(10, 2)")
    cur.execute("ALTER TABLE IF EXISTS rooms ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'available'")

    cur.execute("ALTER TABLE IF EXISTS bookings ADD COLUMN IF NOT EXISTS customer_id INTEGER")
    cur.execute("ALTER TABLE IF EXISTS bookings ADD COLUMN IF NOT EXISTS room_id INTEGER")
    cur.execute("ALTER TABLE IF EXISTS bookings ADD COLUMN IF NOT EXISTS checkin_date DATE")
    cur.execute("ALTER TABLE IF EXISTS bookings ADD COLUMN IF NOT EXISTS checkout_date DATE")
    cur.execute("ALTER TABLE IF EXISTS bookings ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10, 2)")
    cur.execute("ALTER TABLE IF EXISTS bookings ADD COLUMN IF NOT EXISTS registered_name TEXT")
    cur.execute("ALTER TABLE IF EXISTS bookings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'upcoming'")

    cur.execute("ALTER TABLE IF EXISTS checkout_history ADD COLUMN IF NOT EXISTS registered_name TEXT")
    cur.execute("ALTER TABLE IF EXISTS checkout_history ADD COLUMN IF NOT EXISTS customer_id INTEGER")
    cur.execute("ALTER TABLE IF EXISTS checkout_history ADD COLUMN IF NOT EXISTS room_id INTEGER")
    cur.execute("ALTER TABLE IF EXISTS checkout_history ADD COLUMN IF NOT EXISTS checkin_date DATE")
    cur.execute("ALTER TABLE IF EXISTS checkout_history ADD COLUMN IF NOT EXISTS checkout_date DATE")
    cur.execute("ALTER TABLE IF EXISTS checkout_history ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10, 2)")
    cur.execute("ALTER TABLE IF EXISTS checkout_history ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'expired'")

    conn.commit()
    cur.close()


def get_db_dialect() -> str:
    database_url = os.environ.get("DATABASE_URL", "").strip()
    return "postgres" if database_url else "sqlite"


def get_db_connection():
    """Open and return a DB connection: PostgreSQL when DATABASE_URL is set, else SQLite."""
    global _SCHEMA_READY, _DB_DIALECT

    _DB_DIALECT = get_db_dialect()

    if _DB_DIALECT == "postgres":
        database_url = _normalize_database_url(os.environ["DATABASE_URL"].strip())
        conn = psycopg.connect(database_url)

        if not _SCHEMA_READY:
            _bootstrap_schema_postgres(conn)
            _SCHEMA_READY = True

        return conn

    db_path = os.environ.get(
        "DB_PATH",
        str(Path(__file__).resolve().parent / "hotel.db"),
    )
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON")

    if not _SCHEMA_READY:
        _bootstrap_schema_sqlite(conn)
        _SCHEMA_READY = True

    return SQLiteConnectionCompat(conn)
