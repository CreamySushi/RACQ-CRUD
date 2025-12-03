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