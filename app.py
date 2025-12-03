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