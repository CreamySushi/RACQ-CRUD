from flask import Flask, render_template, request, redirect, url_for, session
from datetime import datetime, timedelta
from db_config import get_db_connection


app = Flask(__name__)
app.secret_key = "your_secret_key"

@app.route("/")
def dashboard():
    return render_template("dashboard.html", session=session)