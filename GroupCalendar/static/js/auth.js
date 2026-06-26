function render_login() {
    document.title = "Login"
    document.querySelector('h3').textContent = "Login";
    document.querySelectorAll('.form-text').forEach(element => {
        element.style.display = "none";
    });
    document.querySelector('#re-password-div').style.display = "none";
    document.querySelector('.btn-outline-dark').textContent = "Register";
}


function render_register() {
    document.title = "Register";
    document.querySelector('h3').textContent = "Register";
    document.querySelectorAll('.form-text').forEach(element => {
        element.style.display = "block";
    });
    document.querySelector('#re-password-div').style.display = "block";
    document.querySelector('.btn-outline-dark').textContent = "Login";
}


function get_params() {
    const params = new URLSearchParams(window.location.search);
    return {
        page: params.get('page') || 'login',
    };
}


function navigate(page) {
    let query = `?page=${page}`;

    window.history.pushState({ page }, '', query);

    render_state(page);
}


function render_state() {
    let {page} = get_params();

    // Clear all input fields before rendering
    document.querySelectorAll('input').forEach(element => {
        element.value = "";
    });

    if (page == 'login') {
        render_login();
    } else if (page == 'register') {
        render_register();
    } else{
        navigate('login');
    }
}


function switch_state() {
    let {page} = get_params();
    if (page == 'login') {
        navigate('register');
    } else{
        navigate('login')
    }
}


async function post_register() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const re_password = document.getElementById('re-password').value;

    try {
        let { page } = get_params();
        const response = await fetch(`/auth/${page}`, {
            method: "POST",
            headers: { 'Content-Type': 'application/json'},
            body: JSON.stringify({username, password, re_password})
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message);
        } else if (page == 'register') {
            alert("Account registered");
            navigate('login');
        } else {
            window.location.replace("/");
        }
    } catch (error) {
        alert("Network error, please try again.");
    }
}


// Re-renders page every time forward or backward button is clicled
window.addEventListener('popstate', () => {
    render_state();
});


document.addEventListener('DOMContentLoaded', () => {
    render_state();
    document.querySelector('.btn-outline-dark').addEventListener('click', switch_state);
    
    // Sumbitting post request to server when sumbit is clicked
    // Also handles invalid responses
    document.querySelector('form').addEventListener('submit', async function(event) {
        event.preventDefault();
        
        post_register();
    });
});
