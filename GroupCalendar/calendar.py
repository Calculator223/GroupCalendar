from flask import (
    Blueprint, g, render_template, request, jsonify
)

from GroupCalendar.auth import login_required
from GroupCalendar.db import get_db

import string
from random import choices
import re
from datetime import datetime, timedelta


main_bp = Blueprint('calendar', __name__)
api_bp = Blueprint('api', __name__, url_prefix='/api')


def generate_code():
    allowed_chars = string.ascii_letters
    return ''.join(choices(allowed_chars, k=6))


@main_bp.route('/')
@login_required
def index():
    # Pass any query string into page
    user_query = request.args.get('query', '') 
    return render_template('index.html', query = user_query)


@api_bp.route('/create', methods=["POST"])
@login_required
def create():
    data = request.json
    uid = g.user['uid']
    groupname = data['groupname']

    if not groupname:
        return jsonify({
            'message': 'Group name is required'
        }), 400
    
    db = get_db()

    # Generate an unique invite code
    invite_codes = db.execute(
        'SELECT invitecode FROM groups'
    ).fetchall()
    invite_codes = [i[0] for i in invite_codes]
    code = generate_code()
    while code in invite_codes:
        code = generate_code()

    db.execute(
        'INSERT INTO groups (groupname, invitecode)'
        ' VALUES (?, ?)',
        (groupname, code)
    )
    # Get gid since we did not pass it in
    gid = db.execute(
        'SELECT gid FROM groups WHERE invitecode = ?',
        (code, )
    ).fetchone()[0]
    # Link creator to group
    db.execute(
        'INSERT INTO groupmembers (gid, uid)' \
        ' VALUES (?, ?)',
        (gid, uid, )
    )
    db.commit()
    
    return jsonify({
        'invitecode': code,
        'gid': gid
    }), 200


@api_bp.route('/join', methods = ["POST"])
@login_required
def join():
    data = request.json
    uid = g.user['uid']
    code = data['invitecode']

    if not code:
        return jsonify({
            'message': 'Invite code invalid'
        }), 400
    
    db = get_db()

    # Get gid corresponding to invite code
    gid = db.execute(
        'SELECT gid FROM groups WHERE invitecode = ?',
        (code, )
    ).fetchone()[0]
    # Returns if gid cannot be found
    if gid is None:
        return jsonify({
            'message': 'Invite code invalid'
        }), 400
    
    db.execute(
        'INSERT INTO groupmembers (gid, uid)' \
        ' VALUES (?, ?)', (gid, uid)
    )

    db.commit()

    return jsonify({
        'message': 'Joined group',
        'gid': gid
    }), 200


@api_bp.route('/get-group-members', methods = ["POST"])
@login_required
def get_group_members():
    data = request.json
    uid = g.user['uid']
    gid = data['gid']
    db = get_db()

    members = db.execute(
        'SELECT users.uid, username FROM users'
        ' JOIN groupmembers ON users.uid = groupmembers.uid'
        ' WHERE gid = ?', (gid)
    ).fetchall()

    uids = [i[0] for i in members]
    if uid not in uids:
        return jsonify({
            'message': 'Error: Access denied'
        }), 403
    usernames = [i[1] for i in members]
    
    return jsonify({
        'members': usernames
    }), 200


@api_bp.route('/get-invite-code', methods = ["POST"])
@login_required
def get_invite_code():
    data = request.json
    uid = g.user['uid']
    gid = data['gid']
    db = get_db()

    # Check if user is in group
    members = db.execute(
        'SELECT uid FROM groupmembers'
        ' WHERE gid = ?', (gid, )
    ).fetchall()
    if members is None:
        return jsonify({
            'message': 'Error: Group not found'
        }), 404
    members = [i['uid'] for i in members]
    if uid not in members:
        return jsonify({
            'message': 'Error: Access denied'
        }), 403
    
    invcode = db.execute(
        'SELECT invitecode FROM groups'
        ' WHERE gid = ?', (gid, )
    ).fetchone()[0]

    return jsonify({
        'invitecode': invcode
    }), 200


@api_bp.route('/get-groupname', methods = ['POST'])
@login_required
def get_groupname():
    data = request.json
    uid = g.user['uid']
    gid = data['gid']
    db = get_db()

    # Check if user is in group
    members = db.execute(
        'SELECT uid FROM groupmembers'
        ' WHERE gid = ?', (gid, )
    ).fetchall()
    if members is None:
        return jsonify({
            'message': 'Error: Group not found'
        }), 404
    members = [i['uid'] for i in members]
    if uid not in members:
        return jsonify({
            'message': 'Error: Access denied'
        }), 403
    
    groupname = db.execute(
        'SELECT groupname FROM groups'
        ' WHERE gid = ?', (gid, )
    ).fetchone()[0]
    return jsonify({
        'groupname': [groupname]
    }), 200


@api_bp.route('/get-groups', methods = ["POST"])
@login_required
def get_groups():
    uid = g.user['uid']
    db = get_db()

    groups = db.execute(
        'SELECT g.gid, g.groupname FROM groups g'
        ' JOIN groupmembers m ON g.gid = m.gid'
        ' WHERE m.uid = ?' 
        ' ORDER BY g.groupname ASC', (uid, )
    ).fetchall()
    res = {}
    for i in groups:
        res[i[0]] = i[1]
    return jsonify(res), 200


@api_bp.route('/set-status', methods = ["POST"])
@login_required
def set_status():
    data = request.json
    uid = g.user['uid']
    gid = data['gid']
    date = data['date']
    status = data['status']
    db = get_db()

    # Check if user is in group
    members = db.execute(
        'SELECT uid FROM groupmembers'
        ' WHERE gid = ?', (gid, )
    ).fetchall()
    if members is None:
        return jsonify({
            'message': 'Error: Group not found'
        }), 404
    members = [i['uid'] for i in members]
    if uid not in members:
        return jsonify({
            'message': 'Error: Access denied'
        }), 403
    
    # Check date string format
    pattern = r"^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$"
    if not bool(re.match(pattern, date)):
        return jsonify({
            'message': "Error: Invalid date"
        }), 400
    # Check status range
    if status not in [0, 1, 2]:
        return jsonify({
            'message': "Error: Invalid status"
        }), 400
    
    db.execute(
        'INSERT INTO availability'
        ' VALUES (?, ?, ?, ?)'
        ' ON CONFLICT(gid, uid, date)'
        ' DO UPDATE SET status = ?',
        (gid, uid, date, status, status)
    )
    db.commit()

    return jsonify({
        'message': 'success'
    }), 200


@api_bp.route('/set-days-status', methods = ["POST"])
@login_required
def set_days_status():
    data = request.json
    uid = g.user['uid']
    gid = data['gid']
    start = data['start']
    end = data['end']
    status = data['status']
    db = get_db()

    # Check if user is in group
    members = db.execute(
        'SELECT uid FROM groupmembers'
        ' WHERE gid = ?', (gid, )
    ).fetchall()
    if members is None:
        return jsonify({
            'message': 'Error: Group not found'
        }), 404
    members = [i['uid'] for i in members]
    if uid not in members:
        return jsonify({
            'message': 'Error: Access denied'
        }), 403
    
    # Check date string format
    pattern = r"^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$"
    if (not bool(re.match(pattern, start))) or (not bool(re.match(pattern, end))):
        return jsonify({
            'message': "Error: Invalid date"
        }), 400
    # Check status range
    if status not in [0, 1, 2]:
        return jsonify({
            'message': "Error: Invalid status"
        }), 400
    
    print(start, end)
    date = start
    while date <= end:
        print(gid, uid, date, status)
        db.execute(
            'INSERT INTO availability'
            ' VALUES (?, ?, ?, ?)'
            ' ON CONFLICT(gid, uid, date)'
            ' DO UPDATE SET status = ?',
            (gid, uid, date, status, status)
        )
        date = increment_day(date)
    db.commit()

    return jsonify({
        'message': 'success'
    }), 200


def increment_day(date_str):
    date = datetime.strptime(date_str, "%Y-%m-%d")
    next_day = date + timedelta(days=1)
    return next_day.strftime("%Y-%m-%d")


def subtract_list(a, b):
    return [x for x in a if x not in b]


@api_bp.route('/get-calendar', methods=["POST"])
@login_required
def get_calendar():
    data = request.json
    uid = g.user['uid']
    start = data['start']
    end = data['end']
    gid = data['gid']
    db = get_db()

    # Check if user is in group
    members = db.execute(
        'SELECT uid FROM groupmembers'
        ' WHERE gid = ?', (gid, )
    ).fetchall()
    if members is None:
        return jsonify({
            'message': 'Error: Group not found'
        }), 404
    members = [i['uid'] for i in members]
    if uid not in members:
        return jsonify({
            'message': 'Error: Access denied'
        }), 403
    
    # Check date string format
    pattern = r"^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$"
    if (not bool(re.match(pattern, start))) or (not bool(re.match(pattern, end))):
        return jsonify({
            'message': "Error: Invalid dates"
        }), 400
    
    # Get current username and group members' usernames
    username = db.execute(
        'SELECT username FROM users WHERE uid = ?', (uid, )
    ).fetchone()['username']
    usernames = db.execute(
        'SELECT username FROM users u'
        ' JOIN groupmembers g ON g.uid = u.uid'
        ' WHERE g.gid = ?', (gid, )
    ).fetchall()
    usernames = [i['username'] for i in usernames]
    # Removes current user
    usernames.remove(username)
    # Gets raw data
    raw_data = db.execute(
        'SELECT a.date, u.username, a.status FROM availability a'
        ' JOIN users u ON a.uid = u.uid'
        ' WHERE a.gid = ? AND a.date BETWEEN ? AND ?'
        ' ORDER BY a.date ASC, a.uid ASC',
        (gid, start, end)
    ).fetchall()

    # Constructs response dict
    response = {}
    date = start
    # Skeleton: Blank format
    while date <= end:
        response[date] = {
            "Self": "uncertain",
            "Available": [],
            "Occupied": [],
            "Uncertain": []
        }
        date = increment_day(date)
    
    convert_status = ['Available', 'Occupied', 'Uncertain']
    # Actually runs through raw data
    for row in raw_data:
        d = row['date']
        u = row['username']
        s = convert_status[row['status']]
        if u == username:
            response[d]["Self"] = s.lower()
        else:
            response[d][s].append(u)
    
    # Inserts uncertain values
    for k, v in response.items():
        uncertain = usernames.copy()
        for i in v["Available"]:
            if i in uncertain:
                uncertain.remove(i)
        for i in v["Occupied"]:
            if i in uncertain:
                uncertain.remove(i)
        v["Uncertain"] = uncertain.copy()

    response["MemberCount"] = len(usernames)

    return jsonify(response), 200


@api_bp.route('/get-user', methods = ["POST"])
@login_required
def get_user():
    uid = g.user['uid']
    db = get_db()

    if not uid:
        return jsonify({
            'message': "Error: Invalid uid"
        }), 400

    username = db.execute(
        'SELECT username FROM users WHERE uid = ?', (uid, )
    ).fetchone()

    if not username:
        return jsonify({
            'message': 'Error: Invalid uid'
        }), 400
    
    return jsonify({
        'uid': uid, 'username': username[0]
    }), 200
