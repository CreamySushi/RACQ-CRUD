from flask import Flask, render_template, request, redirect, url_for, session
from datetime import datetime, timedelta
from db_config import get_db_connection


app = Flask(__name__)
app.secret_key = "your_secret_key"

@app.route("/")
def dashboard():
    return render_template("dashboard.html", session=session)

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
@app.route("/user/booking", methods=["GET", "POST"])
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

            
            cur.execute("INSERT INTO bookings (customer_id, room_id, checkin_date, checkout_date, total_amount, registered_name) VALUES (%s,%s,%s,%s,%s, %s)",
                        (user_id, room_id, checkin, checkout, total, reg_name))
            conn.commit()

           
            cur.execute("SELECT LAST_INSERT_ID()")
            bid = cur.fetchone()[0]
            session[f"user_booktime_{bid}"] = datetime.now().timestamp()

           
            cur.execute("UPDATE rooms SET status='Occupied' WHERE room_id=%s", (room_id,))
            conn.commit()

            msg = "Booked Successfully"
            return render_template ("dashboard.html")

        if action == "update":
            bid = request.form["id"]
            
            saved = session.get(f"user_booktime_{bid}")
            if saved:
                old = datetime.fromtimestamp(saved)
                if datetime.now() - old > timedelta(minutes=3):
                    msg = "Edit expired"
                else:
                    reg_name = request.form['registered_name']
                    room_id = request.form["room_id"]
                    checkin = request.form["checkin_date"]
                    checkout = request.form["checkout_date"]
                    total = request.form["total_amount"]

                    
                    cur.execute("UPDATE bookings SET room_id=%s, checkin_date=%s, checkout_date=%s, total_amount=%s WHERE id=%s AND customer_id=%s" ,
                                (room_id, checkin, checkout, total, bid, user_id, reg_name))
                    conn.commit()
                    msg = "Updated"

    cur.execute("SELECT room_id, room_number, room_type, amount FROM rooms WHERE status='available'")
    rooms = cur.fetchall()

    cur.execute("""SELECT b.id, r.room_number, b.checkin_date, b.checkout_date, b.total_amount
                   FROM bookings b JOIN rooms r ON b.room_id=r.room_id
                   WHERE b.customer_id=%s""", (user_id,))
    bookings = cur.fetchall()

    selected_type = request.args.get('room_type')
    if selected_type:
        cur.execute("SELECT room_id, room_number, room_type, amount FROM rooms WHERE status='available' AND room_type=%s", (selected_type,))
    else:
            cur.execute("SELECT room_id, room_number, room_type, amount FROM rooms WHERE status='available'")
    rooms = cur.fetchall()

    cur.close()
    conn.close()

    return render_template("user_booking.html", rooms=rooms, bookings=bookings, msg=msg)

if __name__ == "__main__":
    app.run(debug=True)
