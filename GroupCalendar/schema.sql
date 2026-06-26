CREATE TABLE users(
    uid INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
);

CREATE TABLE groups(
    gid INTEGER PRIMARY KEY AUTOINCREMENT,
    groupname TEXT NOT NULL,
    invitecode TEXT UNIQUE NOT NULL
);

CREATE TABLE groupmembers(
    gid INT NOT NULL,
    uid INT NOT NULL,
    PRIMARY KEY (gid, uid),
    FOREIGN KEY (uid) REFERENCES user(uid),
    FOREIGN KEY (gid) REFERENCES groups(gid)
);

CREATE TABLE availability(
    gid INT NOT NULL,
    uid INT NOT NULL,
    date TEXT NOT NULL,
    status INT NOT NULL,
    PRIMARY KEY (gid, uid, date),
    FOREIGN KEY (uid) REFERENCES user(uid),
    FOREIGN KEY (gid) REFERENCES groups(gid)
);