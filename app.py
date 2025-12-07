from flask import Flask, render_template, request, redirect, url_for, session
from datetime import datetime, timedelta
from db_config import get_db_connection


app = Flask(__name__)
app.secret_key = "your_secret_key"

@app.route("/")
def dashboard():
    available_count = 0
    customer_count = 0
    checkin_count = 0
    occupied_count = 0
    users = []
    bookings = []
    rooms = []
    booking_history = []
    customer_bookings = []

    if "loggedin" in session:
            update_booking_statuses()
            conn = get_db_connection()
            cur = conn.cursor()
            if "loggedin" in session and session.get("role") == "admin":
                
                
                
                conn = get_db_connection()
                cur = conn.cursor()

                
                cur.execute("SELECT COUNT(*) FROM rooms WHERE status='available'")
                available_count = cur.fetchone()[0]

                cur.execute("SELECT COUNT(*) FROM users WHERE role='customer'")
                customer_count = cur.fetchone()[0]
                
                today = datetime.now().strftime('%Y-%m-%d')
                cur.execute("SELECT COUNT(*) FROM bookings WHERE checkin_date=%s", (today,))
                checkin_count = cur.fetchone()[0]

                cur.execute("SELECT COUNT(*) FROM rooms WHERE status='occupied'")
                occupied_count = cur.fetchone()[0]

                
                cur.execute("SELECT * FROM checkout_history")
                booking_history = cur.fetchall()

                cur.execute("SELECT * FROM users WHERE role='customer'")
                users = cur.fetchall()

                cur.execute("SELECT * FROM bookings ")
                bookings = cur.fetchall()

                cur.execute("SELECT * FROM rooms")
                rooms = cur.fetchall()

            elif session.get("role") == "customer":
                # Fetch logged in user's ID
                cur.execute("SELECT user_id FROM users WHERE username=%s", (session["username"],))
                user_row = cur.fetchone()

                if user_row:
                    user_id = user_row[0]
                    # Fetch both Active Bookings and History for this customer
                    # Columns: 0:Type, 1:Number, 2:Amount, 3:Checkin, 4:Checkout, 5:Status
                    query = """
                        SELECT r.room_type, r.room_number, b.total_amount, b.checkin_date, b.checkout_date, b.status
                        FROM bookings b
                        JOIN rooms r ON b.room_id = r.room_id
                        WHERE b.customer_id = %s
                        UNION ALL
                        SELECT r.room_type, r.room_number, h.total_amount, h.checkin_date, h.checkout_date, h.status
                        FROM checkout_history h
                        JOIN rooms r ON h.room_id = r.room_id
                        WHERE h.customer_id = %s
                        ORDER BY checkin_date DESC
                    """
                    cur.execute(query, (user_id, user_id))
                    customer_bookings = cur.fetchall()


            cur.close()
            conn.close()

    
    return render_template("dashboard.html", 
                           session=session,
                           available_count=available_count,
                           customer_count=customer_count,
                           checkin_count=checkin_count,
                           occupied_count=occupied_count,
                           users=users,
                           bookings=bookings,
                           rooms=rooms,
                           booking_history=booking_history,
                           customer_bookings=customer_bookings
                           )

# ------------------------------------- Login -------------------------------------
@app.route("/login", methods=["GET", "POST"])
def user_login():
    msg = ""
    if request.method == "POST":
        email = request.form.get("email", "").strip()
        password = request.form.get("password_hash", "")
        
        
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("SELECT * FROM users WHERE email=%s AND password_hash=%s", (email, password))
        user = cur.fetchone()
        
        cur.close()
        conn.close()

        if user:
            session["loggedin"] = True
            session["email"] = user[4]
            session["password_hash"] = password
            session["role"] = user[8]
            session["username"] = user[3]
            session["surname"] = user[1]   
            session["firstname"] = user[2]  
            return redirect(url_for("dashboard"))
            
        else:
            msg = "Invalid account"

    return render_template("login.html", msg=msg)

# ------------------------------------- Register -------------------------------------
@app.route("/register", methods=["GET", "POST"])
def register_user():
    msg = ""
    if request.method == "POST":
        surname = request.form.get("surname", "").strip()
        firstname = request.form.get("firstname", "").strip()
        password = request.form.get("password_hash", "")
        email = request.form.get("email", "").strip()
        phone = request.form.get("phone", "").strip()
        username = request.form.get("username", "").strip()
        role = 'customer'

        
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("SELECT * FROM users WHERE email=%s", (email,))
        existing = cur.fetchone()

        if existing:
            msg = "Email already exists"
        else:
            cur.execute("INSERT INTO users (surname, firstname, email, password_hash, phone, username, role) VALUES (%s, %s, %s, %s, %s, %s, %s)", (surname, firstname, email, password, phone, username, role))
            conn.commit()
            return redirect(url_for("user_login"))
            
        cur.close()
        conn.close()

    return render_template("register.html", msg=msg)

# ------------------------------------- Logout -------------------------------------
@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("dashboard"))

# ------------------------------------- Booking -------------------------------------
@app.route("/booking", methods=["GET", "POST"])
def booking():
    if "loggedin" not in session or session["role"] != 'customer':
        return redirect(url_for("user_login"))

    msg = ""
    conn = get_db_connection()
    cur = conn.cursor()

    action = request.form.get("_action")

   
    cur.execute("SELECT user_id FROM users WHERE username=%s", (session["username"],))
    row = cur.fetchone()
    user_id = row[0] if row else None

    if not user_id:
        return render_template("user_booking.html", msg="User profile error. Please relogin.")

    if request.method == "POST":
        if action == "add":
            reg_name = request.form.get("registered_name")
            room_id = request.form["room_id"]
            checkin = request.form["checkin_date"]
            checkout = request.form["checkout_date"]
            total = request.form["total_amount"]

            cur.execute("""SELECT id FROM bookings 
                           WHERE customer_id=%s AND room_id=%s AND checkin_date=%s""", 
                           (user_id, room_id, checkin))
            existing_booking = cur.fetchone()

            if existing_booking:
                conn.close()
                return redirect(url_for('dashboard'))

            cur.execute("INSERT INTO bookings (customer_id, room_id, checkin_date, checkout_date, total_amount, registered_name) VALUES (%s,%s,%s,%s,%s, %s)",
                        (user_id, room_id, checkin, checkout, total, reg_name))
            conn.commit()

            cur.execute("UPDATE rooms SET status='Occupied' WHERE room_id=%s", (room_id,))
            conn.commit()
            
            return redirect(url_for('dashboard'))

    cur.execute("SELECT room_id, room_number, room_type, amount FROM rooms WHERE status='available'")
    rooms = cur.fetchall()

    cur.execute("""SELECT b.id, r.room_number, b.checkin_date, b.checkout_date, b.total_amount
                   FROM bookings b JOIN rooms r ON b.room_id=r.room_id
                   WHERE b.customer_id=%s""", (user_id,))
    bookings = cur.fetchall()

    cur.close()
    conn.close()
    
    return render_template("user_booking.html", rooms=rooms, bookings=bookings, msg=msg)
            
# ----------------------------------- UPDATE STATUS ---------------------------------
def update_booking_statuses():
    
    conn = get_db_connection()
    cur = conn.cursor()
    today = datetime.now().strftime('%Y-%m-%d')

    # 0. ENSURE TABLE EXISTS
    cur.execute("""CREATE TABLE IF NOT EXISTS checkout_history (
                    id int AUTO_INCREMENT PRIMARY KEY,
                    registered_name varchar(100),
                    customer_id int,
                    room_id int,
                    checkin_date date,
                    checkout_date date,
                    total_amount decimal(10,2),
                    status varchar(20) DEFAULT 'expired'
                )""")
    
    
    try:
        cur.execute("SELECT registered_name FROM checkout_history LIMIT 1")
    except:
        
        cur.execute("ALTER TABLE checkout_history ADD COLUMN registered_name varchar(100) AFTER id")
        conn.commit()

    
    cur.execute("UPDATE bookings SET status='upcoming' WHERE checkin_date > %s", (today,))
    cur.execute("UPDATE bookings SET status='active' WHERE checkin_date <= %s AND checkout_date > %s", (today, today))
    cur.execute("UPDATE bookings SET status='expired' WHERE checkout_date <= %s", (today,))
    
    
    move_query = """
        INSERT INTO checkout_history (registered_name, customer_id, room_id, checkin_date, checkout_date, total_amount, status)
        SELECT registered_name, customer_id, room_id, checkin_date, checkout_date, total_amount, 'expired'
        FROM bookings
        WHERE status = 'expired'
    """
    cur.execute(move_query)

    
    cur.execute("""
        UPDATE rooms r
        JOIN bookings b ON r.room_id = b.room_id
        SET r.status = 'available'
        WHERE b.status = 'expired'
    """)

    cur.execute("DELETE FROM bookings WHERE status = 'expired'")
    
    conn.commit()
    cur.close()
    conn.close()

if __name__ == "__main__":
    app.run(debug=True)
