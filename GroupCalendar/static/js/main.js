// Importing functions from another file
import { fetch_calendar, post_day_status, fetch_groups, 
    fetch_groupname, fetch_invite,
    fetch_group_members,
    fetch_user,
    post_days_status} from "./api.js";

// Global variables
let display_month;
let display_year;
let current_gid;
let current_groupname;
let username = 'waa';
let uid;
let months = {
    0: "January", 1: "Feburary", 2: "March", 3: "April",
    4: "May", 5:"June", 6: "July", 7: "August",
    8: "September", 9: "October", 10: "November", 11: "December"
};


function to_date_string(date) {
    const year = date.getFullYear();
    // Months are 0-indexed (January is 0), so we add 1
    const month = String(date.getMonth() + 1).padStart(2, '0'); 
    const day = String(date.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    return formattedDate;
}


async function copy_to_clipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.warn('Clipboard API failed, trying fallback');
        }
    }

    // Fallback to execCommand
    try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        return true;
    } catch (err) {
        console.error('All copy methods failed:', err);
        return false;
    }
}


function copy_invite() {
    var copytext = document.getElementById('invite-code');
    copy_to_clipboard(copytext.textContent);
    alert('Invide code copied');
}


// Returns the date to start rendering from
// (The sunday on or before the start of month)
function get_month_render_range(year, month) {
    let month_first = new Date(year, month, 1);
    let month_last;
    if (month == 11) {
        month_last = new Date(year+1, 0, 1);
    } else{
        month_last = new Date(year, month+1, 1);
    }
    month_last.setTime(month_last.getTime() - 86400*1000);

    let start = new Date();
    start.setTime(month_first.getTime() - month_first.getDay()*86400*1000);
    let end = new Date();
    end.setTime(month_last.getTime() + (6-month_last.getDay())*86400*1000);
    
    return [start,end];
}


async function render_home() {
    const template = document.getElementById("home-template");
    const home_clone = template.content.cloneNode(true);
    const groups = await fetch_groups();
    const b_parent = home_clone.querySelector("div.home");

    // Create button for each group name
    Object.keys(groups).forEach(i => {
        const element=groups[i];
        let button = document.createElement("button");
        button.textContent = element;
        button.classList.add("btn", "btn-light", "border", "border-dark", "btn-lg", "shadow");
        
        // Adding onclick events
        button.addEventListener('click', () => {
            navigate('calendar', i);
        })

        b_parent.insertBefore(button, home_clone.querySelector("p"));
    });

    // Adding onclick events to forms
    home_clone.querySelector('#create-form').addEventListener('submit', async function(event) {
        event.preventDefault();

        const groupname = document.querySelector("#groupname").value;
        try {
            const response = await fetch('/api/create', {
                method: "POST",
                headers: { 'Content-Type': 'application/json'},
                body: JSON.stringify({'groupname': groupname})
            });
            const data = await response.json();
            if (!response.ok) {
                alert(data.message);
            } else{
                console.log(data.invitecode);
                navigate('calendar', data.gid);
                await copy_to_clipboard(data.invitecode);
            }
        } catch (error) {
            console.log(error);
            alert("Network error, please try again.");
        }
    });
    home_clone.querySelector('#join-form').addEventListener('submit', async function(event) {
        event.preventDefault();

        const code = document.querySelector("#invitecode").value;
        try {
            const response = await fetch('/api/join', {
                method: "POST",
                headers: { 'Content-Type': 'application/json'},
                body: JSON.stringify({'invitecode': code})
            });
            const data = await response.json();
            if (!response.ok) {
                alert(data.message);
            } else{
                alert(data.message);
                navigate('calendar', data.gid);
            }
        } catch (error) {
            alert("Network error, please try again.");
        }
    });

    document.body.appendChild(home_clone);
}


// Render top navbar
async function render_navbar() {
    let groups = await fetch_groups(); //API CALL
    let parent = document.querySelector("ul.navbar-nav");
    let logout = document.querySelector("#logout-mobile");
    // Create button for each group name
    // Note that gid is groups[i]
    Object.keys(groups).forEach(i => {
        const element = groups[i];
        let a = document.createElement("a");
        a.classList.add("nav-item", "text-truncate", "nav-link", "my-auto");
        a.textContent = element;
        if (element == current_groupname) {
            a.classList.add("active");
        }
        a.addEventListener('click', () => {
            navigate('calendar', i);
        });

        parent.insertBefore(a, logout)
    });
    // Show username
    const user = await fetch_user();
    username = user.username;
    uid = user.uid;
    document.querySelector('.username-display').textContent = user.username;

    document.querySelectorAll('.username-display').forEach(element => {
        element.textContent = username;
    });
}


// Render calendar skeleton
async function render_calendar() {
    // Creating copy of calendar template
    const template = document.getElementById('calendar-template');
    const calendar_clone = template.content.cloneNode(true);

    // Adding click functions to arrow buttons
    let increment_delta = [-12, -1, 1, 12]
    let arrows = calendar_clone.querySelectorAll("button.fs-5.lh-1");
    for (let i = 0; i < 4; i++) {
        arrows[i].addEventListener("click", async function() {
            await increment_month(increment_delta[i]);
        })
    }

    // Adding onclick event to invite code button
    calendar_clone.querySelector("#copy-invite").addEventListener('click', copy_invite);
    // Editing invite code
    let code = await fetch_invite(current_gid);
    calendar_clone.querySelector("#invite-code").textContent = code;
    // Editing member list
    let mem_list = await fetch_group_members(current_gid);
    let str = ''
    for (let j = 0; j < mem_list.length; j++) {
        str += mem_list[j];
        if (j != mem_list.length-1) {
            str += '\n';
        }
    }
    calendar_clone.querySelector("#member-list").textContent = str;

    // Adding onclick events to set all
    const status_buttons = calendar_clone.querySelectorAll('.set-all-dropdown li button')
    for (let i = 0; i < status_buttons.length; i++) {
        const element = status_buttons[i];
        element.addEventListener("click", async function() {
            const range = get_month_render_range(display_year, display_month);
            const start = to_date_string(range[0]);
            const end = to_date_string(range[1]);
            await post_days_status(start, end, i, current_gid);
            render_page();
        });
    }

    // Add clone to body
    document.body.appendChild(calendar_clone);
}


// Render cell
function render_cell(parent, date, data, member_cnt) {
    // Get and modify data
    const day = date.getDate();
    const template_id = "calendar-cell";
    const template = document.getElementById(template_id);
    const cell_clone = template.content.cloneNode(true);
    const statuses = ["Available", "Occupied", "Uncertain"];

    // Editing template values
    cell_clone.querySelector(".self-avail").classList.add("self-"+data["Self"].toLowerCase());
    cell_clone.querySelector(".date-num").textContent = day;

    // Setting coloured div widths
    let available_width = Math.round(data["Available"].length/member_cnt*100);
    let occupied_width = Math.round(data["Occupied"].length/member_cnt*100);
    if (member_cnt == 0){
        available_width = 0;
        occupied_width = 0;
    }
    cell_clone.querySelector(".others-available").style.width = available_width+"%";
    cell_clone.querySelector(".others-occupied").style.width = occupied_width+"%";

    let dropdown_labels = cell_clone.querySelectorAll(".status-list");
    for (let i=0; i<3; i++) {
        let usernames = '';
        for (let j = 0; j < data[statuses[i]].length; j++) {
            usernames += data[statuses[i]][j];
            if (j != data[statuses[i]].length-1) {
                usernames += '\n';
            }
        }
        dropdown_labels[i].textContent = usernames;
    }

    // Onclick events here
    // Declaring constants here to be used,
    // so that scoping problems can be avoided
    const status_select_buttons = cell_clone.querySelectorAll(".status-select li button");
    const avail_button = cell_clone.querySelector(".self-avail");
    const status_select_dropdown = cell_clone.querySelector(".status-select");
    const date_str = to_date_string(date);
    for (let i = 0; i < 3; i++) {
        status_select_buttons[i].addEventListener('click', async function() {
            let next_class = "self-" + statuses[i].toLowerCase()
            status_select_dropdown.classList.remove("show");
            await post_day_status(date_str, statuses[i], current_gid); //API CALL
            avail_button.classList = '';
            avail_button.classList.add("btn", "dropdown-toggle", "w-100", "h-100", "date-num", "self-avail", "p-0", next_class);
        });
    }
    
    // Inserting template to parent
    parent.appendChild(cell_clone);
}


// Render entire month
async function render_month() {
    // defining constants and variables
    const render_range = get_month_render_range(display_year, display_month);
    const days = Math.floor((render_range[1].getTime()-render_range[0].getTime())/86400/1000) + 1;
    const calendar = document.querySelector('#days-display');
    
    // API CALL
    const start = to_date_string(render_range[0])
    const end = to_date_string(render_range[1])
    let data = await fetch_calendar(start, end, current_gid);
    let day_data;
    let date = render_range[0];

    // Editing header row
    document.querySelector("div.d-flex.col h2").textContent = months[display_month] + " " + display_year;

    // creating rows to store the cells
    // Then create cells to fill in the rows
    for (let i=0; i<days/7; i++) {
        let row = document.createElement("div");
        row.classList.add('row', 'flex-nowrap','text-center','calendar-row');
        calendar.appendChild(row);
        for (let j=0; j<7; j++) {
            day_data = data[to_date_string(date)];
            // Pass blank JSON if data does not exist
            if (day_data == undefined) {
                day_data = {
                    "Self": "uncertain",
                    "Available": [], "Occupied": [], "Uncertain": [],
                }
            }
            render_cell(row, date, day_data, data["MemberCount"]);
            date.setTime(date.getTime() + 86400*1000)
        }
    }
}


// Deletes all cells from calendar
async function remove_cells() {
    document.querySelectorAll(".calendar-row").forEach(element => {
        element.remove();
    });
}

// Remove calendar or home page
function clear_page() {
    let nav_links = document.querySelectorAll('ul.navbar-nav a.nav-item');
    nav_links.forEach(element => {
        element.remove();
    });
    let body = document.body.children;
    for (const element of body) {
        if (!(["TEMPLATE", "NAV"].includes(element.tagName))) {
            element.remove();
        }
    }
}


// Set new display month and year, then refreshes calendar
async function increment_month(delta) {
    let t = display_month+display_year*12+delta;
    display_month = t%12;
    display_year = Math.floor(t/12);
    await remove_cells();
    render_month();
}


// Get parameters from query string
async function get_params() {
    const params = new URLSearchParams(window.location.search);
    current_gid = params.get('gid');
    if (current_gid != null) {
        current_groupname = await fetch_groupname(current_gid);
    } else{
        current_groupname = null;
    }
    return {
        page: params.get('page') || 'home',
        gid: params.get('gid')
    };
}


// Navigates to given page
// page => {home, calendar}
function navigate(page, gid=null) {
    let query = `?page=${page}`;
    if (gid) {
        query += `&gid=${gid}`;
        current_gid = gid;
    }

    window.history.pushState({ page, gid }, '', query);

    render_page();
}


// Re-renders whole page
async function render_page() {
    const {page, gid} = await get_params();

    clear_page();

    switch (page) {
        case ('home'):
            await render_navbar();
            await render_home();
            break;
        case ('calendar'):
            await render_navbar();
            await render_calendar();
            await render_month();
            break;
        default:
            document.body.innerHTML += `
            <div class="container">
                <h1 class="py-5 text-center">404 - Page Not Found</h1>
                <div class="w-100 d-flex"><button class="m-auto btn btn-lg btn-outline-primary">
                Home</button></div>
            </div>
            `
            document.querySelector(".btn-outline-primary").addEventListener('click', () => {
                navigate("home");
            });
    }
}


// Re-renders page every time forward or backward button is clicled
window.addEventListener('popstate', () => {
    render_page();
});


document.addEventListener('DOMContentLoaded', () => {
    // Initializing variables and constants
    let current_time = new Date();
    display_month = current_time.getMonth();
    display_year = current_time.getFullYear();

    // Registering onclick events for static elements
    // Home button
    document.querySelector('.navbar-brand').addEventListener('click', () => {
        navigate('home');
    });
    // Logout buttons
    document.querySelector('#logout-mobile div a').addEventListener('click', async function(event) {
        const response = await fetch('/auth/logout', {
            method: 'POST'
        });
        if (response.ok){window.location.replace('/auth?page=login');}
    })
    document.querySelector('#logout-landscape div a').addEventListener('click', async function(event) {
        const response = await fetch('/auth/logout', {
            method: 'POST'
        });
        if (response.ok){window.location.replace('/auth?page=login');}
    })

    render_page();
});