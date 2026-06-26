import functools

from flask import (
    Blueprint, g, redirect, render_template, request, session, url_for, jsonify
)
from werkzeug.security import check_password_hash, generate_password_hash

from GroupCalendar.db import get_db

bp = Blueprint('auth', __name__, url_prefix='/auth')


# Index page for auth
@bp.route('/')
def auth():
    return render_template('auth.html')


@bp.route('/register', methods = ['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    re_password = data.get('re_password')
    db = get_db()

    # Data validation
    if not username:
        return jsonify({
            'message': "Username is required"
        }), 400
    elif not password:
        return jsonify({
            'message': "Password is required"
        }), 400
    elif len(username) > 20:
        return jsonify({
            'message': "Username is too long"
        }), 400
    elif len(password) < 8:
        return jsonify({
            'message': "Password is too short"
        }), 400
    elif password != re_password:
        return jsonify({
            'message': "Passwords are not be the same"
        }), 400
    
    hashed_password = generate_password_hash(password)
    try:
        # Try registering user into database
        db.execute(
            "INSERT INTO users (username, password) VALUES (?, ?)",
            (username, hashed_password),
        )
        db.commit()
    # Integrity error is raised when user already exists
    except db.IntegrityError:
        return jsonify({
            
            'message': f"Username {username} already registered"
        }), 400
    # Return status code 200 if nothing is wrong
    else:
        return jsonify({
            'success': True
        }), 200


@bp.route('/login', methods = ["POST"])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    db = get_db()

    user = db.execute(
        "SELECT * FROM users WHERE username = ?", (username,)
    ).fetchone()

    # Data validation
    if user is None:
        return jsonify({
            'message': 'Incorrect username'
        }), 404
    elif not check_password_hash(user['password'], password):
        return jsonify({
            'message': "Incorrect password"
        }), 400
    
    session.clear()
    session['user_id'] = user['uid']
    return jsonify({
        'message': 'success'
    }), 200


@bp.route('/logout', methods = ['POST'])
def logout():
    print("Logging out")
    session.clear()

    return jsonify({
        'message': 'Success'
    }), 200


@bp.before_app_request
def load_logged_in_user():
    user_id = session.get('user_id')
    
    if user_id is None:
        g.user = None
    else:
        g.user = get_db().execute(
            'SELECT * FROM users WHERE uid = ?', (user_id,)
        ).fetchone()


def login_required(view):
    @functools.wraps(view)
    def wrapped_view(**kwargs):
        if g.user is None:
            return redirect(url_for('auth.auth', page = 'login'))

        return view(**kwargs)

    return wrapped_view
