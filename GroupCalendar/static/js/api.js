export async function fetch_calendar(start, end, gid) {
    // Note that the list does not include user
    const response = await fetch('/api/get-calendar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify({
            'gid': gid,
            'start': start,
            'end': end
        })
    });
    const data = await response.json();
    if (!response.ok) {
        alert(data.message);
        return '';
    }
    let data_text = `
    {
        "2026-06-18": {
            "Self": "available",
            "Available": ["a", "b"],
            "Occupied" : ["c", "d"],
            "Uncertain": [        ]
        },
        "2026-06-19": {
            "Self": "occupied",
            "Available": ["a", "b"],
            "Occupied" : [        ],
            "Uncertain": ["c", "d"]
        },
        "2026-06-20": {
            "Self": "uncertain",
            "Available": [             ],
            "Occupied" : ["a"          ],
            "Uncertain": ["b", "c", "d"]
        },
        "MemberCount": 5
    }
    `;
    return data;
}

export async function post_day_status(date_str, status, gid){
    const s = {
        "Available": 0,
        'Occupied': 1,
        'Uncertain': 2
    }

    const response = await fetch('/api/set-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify({
            'gid': gid,
            'date': date_str,
            'status': s[status]
        })
    });
    const data = await response.json();
    if (!response.ok) {
        alert(data.message);
        return '';
    }
    return;
}

export async function post_days_status(start, end, status, gid) {
    const response = await fetch('/api/set-days-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify({
            'start': start, 'end': end, 'status': status, 'gid': gid
        })
    });
    const data = await response.json();
        if (!response.ok) {
        alert(data.message);
        return '';
    }
    return;
}

export async function fetch_groups() {
    const response = await fetch('/api/get-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json'},
    });
    const data = await response.json();
    if (!response.ok) {
        return {};
    }
    return data;
}

export async function fetch_groupname(gid) {
    const response = await fetch('/api/get-groupname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify({'gid': gid})
    });
    const data = await response.json();
    if (!response.ok) {
        alert(data.message);
        return '';
    }
    return data.groupname;
}

export async function fetch_invite(gid) {
    const response = await fetch('/api/get-invite-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify({'gid': gid})
    });
    const data = await response.json();
    if (!response.ok) {
        alert(data.message);
        return '';
    }
    return data.invitecode;
}


export async function fetch_group_members(gid) {
    const response = await fetch('/api/get-group-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify({'gid': gid})
    });
    const data = await response.json();
    if (!response.ok) {
        alert(data.message);
        return ['Please refresh'];
    }
    return data.members;
}


export async function fetch_user() {
    const response = await fetch('/api/get-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json'}
    });
    const data = await response.json();
    if (!response.ok) {
        alert(data.message);
        return {'uid': 0, 'username': undefined};
    }
    return data
}
