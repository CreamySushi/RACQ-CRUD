import os
import sqlite3
from pathlib import Path

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
        return "postgresql://" + url[len("postgres://") :]
    return url


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
