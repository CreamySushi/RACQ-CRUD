import os
from functools import wraps
from datetime import datetime

import bcrypt
from dotenv import load_dotenv
from flask import Flask, render_template, request, redirect, url_for, session

from db_config import get_db_connection


# App setup
load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ["FLASK_SECRET_KEY"]



# Auth decorators

def login_required(f):
    """Redirect to login if the user is not authenticated."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if "loggedin" not in session:
            return redirect(url_for("user_login"))
        return f(*args, **kwargs)
    return decorated


def admin_required(f):
    """Redirect to login if the user is not an admin."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("loggedin") or session.get("role") != "admin":
            return redirect(url_for("user_login"))
        return f(*args, **kwargs)
    return decorated


# Password Security

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(rounds=12)).decode()


def verify_password(plain: str, hashed: str) -> bool:
    if isinstance(hashed, str):
        hashed = hashed.encode()
    return bcrypt.checkpw(plain.encode(), hashed)



# Booking status helper (runs once per admin page load)

def sync_booking_statuses():
    """
    Update booking statuses based on today's date, move expired bookings
    to checkout_history, and free up those rooms.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    today = datetime.now().strftime("%Y-%m-%d")

    # Refresh statuses
    cur.execute("UPDATE bookings SET status = 'upcoming' WHERE checkin_date  >  %s", (today,))
    cur.execute("UPDATE bookings SET status = 'active'   WHERE checkin_date  <= %s AND checkout_date > %s", (today, today))
    cur.execute("UPDATE bookings SET status = 'expired'  WHERE checkout_date <= %s", (today,))

    # Archive expired bookings
    cur.execute("""
        INSERT INTO checkout_history
            (registered_name, customer_id, room_id, checkin_date, checkout_date, total_amount, status)
        SELECT registered_name, customer_id, room_id, checkin_date, checkout_date, total_amount, 'expired'
        FROM bookings
        WHERE status = 'expired'
    """)

    # Free rooms whose bookings just expired
    cur.execute("""
        UPDATE rooms
        SET    status = 'available'
        WHERE  room_id IN (
            SELECT room_id
            FROM bookings
            WHERE status = 'expired'
        )
    """)

    cur.execute("DELETE FROM bookings WHERE status = 'expired'")

    conn.commit()
    cur.close()
    conn.close()



# Dashboard

@app.route("/")
def dashboard():
    # Shared defaults
    ctx = dict(
        available_count=0,
        customer_count=0,
        checkin_count=0,
        occupied_count=0,
        users=[],
        bookings=[],
        rooms=[],
        booking_history=[],
        customer_bookings=[],
    )

    if not session.get("loggedin"):
        return render_template("dashboard.html", session=session, **ctx)

    conn = get_db_connection()
    cur = conn.cursor()

    if session["role"] == "admin":
        sync_booking_statuses()

        today = datetime.now().strftime("%Y-%m-%d")

        cur.execute("SELECT COUNT(*) FROM rooms    WHERE status = 'available'")
        ctx["available_count"] = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM users    WHERE role = 'customer'")
        ctx["customer_count"] = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM bookings WHERE checkin_date = %s", (today,))
        ctx["checkin_count"] = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM rooms    WHERE status = 'occupied'")
        ctx["occupied_count"] = cur.fetchone()[0]

        cur.execute("SELECT * FROM checkout_history")
        ctx["booking_history"] = cur.fetchall()

        cur.execute("SELECT * FROM users WHERE role = 'customer'")
        ctx["users"] = cur.fetchall()

        cur.execute("SELECT * FROM bookings")
        ctx["bookings"] = cur.fetchall()

        cur.execute("SELECT * FROM rooms")
        ctx["rooms"] = cur.fetchall()

    elif session["role"] == "customer":
        cur.execute("SELECT user_id FROM users WHERE username = %s", (session["username"],))
        row = cur.fetchone()

        if row:
            user_id = row[0]
            cur.execute("""
                SELECT r.room_type, r.room_number, b.total_amount, b.checkin_date, b.checkout_date, b.status
                FROM   bookings b
                JOIN   rooms    r ON b.room_id = r.room_id
                WHERE  b.customer_id = %s
                UNION ALL
                SELECT r.room_type, r.room_number, h.total_amount, h.checkin_date, h.checkout_date, h.status
                FROM   checkout_history h
                JOIN   rooms            r ON h.room_id = r.room_id
                WHERE  h.customer_id = %s
                ORDER BY checkin_date DESC
            """, (user_id, user_id))
            ctx["customer_bookings"] = cur.fetchall()

    cur.close()
    conn.close()

    return render_template("dashboard.html", session=session, **ctx)



# Auth — login / register / forgot password / logout

@app.route("/login", methods=["GET", "POST"])
def user_login():
    error = request.args.get("msg")  # Allows grabbing ?msg= from URL

    if request.method == "POST":
        email    = request.form.get("email", "").strip()
        password = request.form.get("password_hash", "")

        conn = get_db_connection()
        cur  = conn.cursor()
        cur.execute(
            "SELECT user_id, surname, firstname, username, email, password_hash, role "
            "FROM users WHERE email = %s",
            (email,)
        )
        user = cur.fetchone()
        cur.close()
        conn.close()

        if user and verify_password(password, user[5]):
            session["loggedin"]  = True
            session["user_id"]   = user[0]
            session["surname"]   = user[1]
            session["firstname"] = user[2]
            session["username"]  = user[3]
            session["email"]     = user[4]
            session["role"]      = user[6]
            return redirect(url_for("dashboard"))

        error = "Incorrect email or password."

    return render_template("user_account/login.html", msg=error)


@app.route("/register", methods=["GET", "POST"])
def register_user():
    error = None

    if request.method == "POST":
        surname   = request.form.get("surname",       "").strip()
        firstname = request.form.get("firstname",     "").strip()
        username  = request.form.get("username",      "").strip()
        email     = request.form.get("email",         "").strip()
        phone     = request.form.get("phone",         "").strip()
        password  = request.form.get("password_hash", "")

        conn = None
        cur = None
        try:
            conn = get_db_connection()
            cur = conn.cursor()

            cur.execute("SELECT user_id FROM users WHERE email = %s", (email,))
            if cur.fetchone():
                error = "An account with that email already exists."
            else:
                hashed = hash_password(password)
                cur.execute(
                    "INSERT INTO users (surname, firstname, username, email, phone, password_hash, role) "
                    "VALUES (%s, %s, %s, %s, %s, %s, 'customer')",
                    (surname, firstname, username, email, phone, hashed)
                )
                conn.commit()
                return redirect(url_for("user_login", msg="Account created successfully! Please log in."))
        except Exception:
            app.logger.exception("Registration failed")
            error = "Registration failed due to a server configuration issue."
        finally:
            if cur:
                cur.close()
            if conn:
                conn.close()

    return render_template("user_account/register.html", msg=error)


@app.route("/forgot_password", methods=["GET", "POST"])
def forgot_password():
    error   = None
    success = None

    if request.method == "POST":
        email        = request.form.get("email",        "").strip()
        new_password = request.form.get("new_password", "").strip()

        conn = get_db_connection()
        cur  = conn.cursor()
        cur.execute("SELECT user_id FROM users WHERE email = %s", (email,))
        user = cur.fetchone()

        if user:
            hashed = hash_password(new_password)
            cur.execute("UPDATE users SET password_hash = %s WHERE email = %s", (hashed, email))
            conn.commit()
            cur.close()
            conn.close()
            success = "Password reset successful! Please log in."
            return render_template("user_account/login.html", msg=success)

        error = "No account found with that email."
        cur.close()
        conn.close()

    return render_template("user_account/forgot_pass.html", msg=error)


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("dashboard"))



# Booking

@app.route("/booking", methods=["GET", "POST"])
@login_required
def booking():
    conn = get_db_connection()
    cur  = conn.cursor()

    cur.execute("SELECT user_id FROM users WHERE username = %s", (session["username"],))
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        return render_template("user_booking.html", msg="User profile error — please log in again.")

    user_id = row[0]

    if request.method == "POST" and request.form.get("_action") == "add":
        reg_name  = request.form["registered_name"]
        room_id   = request.form["room_id"]
        checkin   = request.form["checkin_date"]
        checkout  = request.form["checkout_date"]
        total     = request.form["total_amount"]

        
        cur.execute(
            "SELECT id FROM bookings WHERE customer_id = %s AND room_id = %s AND checkin_date = %s",
            (user_id, room_id, checkin)
        )
        if not cur.fetchone():
            cur.execute(
                "INSERT INTO bookings (customer_id, room_id, checkin_date, checkout_date, total_amount, registered_name) "
                "VALUES (%s, %s, %s, %s, %s, %s)",
                (user_id, room_id, checkin, checkout, total, reg_name)
            )
            cur.execute("UPDATE rooms SET status = 'occupied' WHERE room_id = %s", (room_id,))
            conn.commit()

        cur.close()
        conn.close()
        return redirect(url_for("dashboard"))

    cur.execute(
        "SELECT room_id, room_number, room_type, amount FROM rooms WHERE status = 'available'"
    )
    rooms = cur.fetchall()

    cur.execute("""
        SELECT b.id, r.room_number, b.checkin_date, b.checkout_date, b.total_amount
        FROM   bookings b
        JOIN   rooms    r ON b.room_id = r.room_id
        WHERE  b.customer_id = %s
    """, (user_id,))
    bookings = cur.fetchall()

    cur.close()
    conn.close()

    return render_template("user_booking.html", rooms=rooms, bookings=bookings, msg=None)



# Admin — customer management

@app.route("/edit_customer/<int:id>", methods=["GET", "POST"])
@admin_required
def edit_customer(id):
    conn = get_db_connection()
    cur  = conn.cursor()

    if request.method == "POST":
        surname   = request.form["surname"]
        firstname = request.form["firstname"]
        phone     = request.form["phone"]
        email     = request.form["email"]

        cur.execute(
            "UPDATE users SET surname=%s, firstname=%s, phone=%s, email=%s WHERE user_id=%s",
            (surname, firstname, phone, email, id)
        )
        conn.commit()
        cur.close()
        conn.close()
        return redirect(url_for("dashboard") + "#overview_section")

    cur.execute("SELECT * FROM users WHERE user_id = %s", (id,))
    customer = cur.fetchone()
    cur.close()
    conn.close()

    return render_template("edit_customer.html", customer=customer)


@app.route("/delete_customer/<int:id>")
@admin_required
def delete_customer(id):
    conn = get_db_connection()
    cur  = conn.cursor()
    cur.execute("DELETE FROM users WHERE user_id = %s", (id,))
    conn.commit()
    cur.close()
    conn.close()
    return redirect(url_for("dashboard") + "#overview_section")



# Admin — booking management

@app.route("/edit_booking/<int:id>", methods=["GET", "POST"])
@admin_required
def edit_booking(id):
    conn = get_db_connection()
    cur  = conn.cursor()

    if request.method == "POST":
        reg_name = request.form["registered_name"]
        checkin  = request.form["checkin_date"]
        checkout = request.form["checkout_date"]
        total    = request.form["total_amount"]

        cur.execute(
            "UPDATE bookings SET registered_name=%s, checkin_date=%s, checkout_date=%s, total_amount=%s "
            "WHERE id = %s",
            (reg_name, checkin, checkout, total, id)
        )
        conn.commit()
        cur.close()
        conn.close()
        return redirect(url_for("dashboard") + "#overview_section")

    cur.execute("SELECT * FROM bookings WHERE id = %s", (id,))
    booking = cur.fetchone()
    cur.close()
    conn.close()

    return render_template("edit_booking.html", booking=booking)


@app.route("/delete_booking/<int:id>")
@admin_required
def delete_booking(id):
    """Delete an active booking and mark the room as available."""
    conn = get_db_connection()
    cur  = conn.cursor()

    cur.execute("SELECT room_id FROM bookings WHERE id = %s", (id,))
    row = cur.fetchone()
    if row:
        cur.execute("DELETE FROM bookings       WHERE id      = %s", (id,))
        cur.execute("UPDATE rooms SET status = 'available' WHERE room_id = %s", (row[0],))
        conn.commit()

    cur.close()
    conn.close()
    return redirect(url_for("dashboard") + "#overview_section")


@app.route("/delete_history/<int:id>")
@admin_required
def delete_history(id):
    """Permanently remove a record from checkout history."""
    conn = get_db_connection()
    cur  = conn.cursor()
    cur.execute("DELETE FROM checkout_history WHERE id = %s", (id,))
    conn.commit()
    cur.close()
    conn.close()
    return redirect(url_for("dashboard") + "#overview_section")



# Entry point

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)


