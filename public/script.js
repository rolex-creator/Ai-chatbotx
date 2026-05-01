let botName = "AI Bot";
const messagesDiv = document.getElementById('messages');

async function init() {
    const res = await fetch('/api/settings');
    const data = await res.json();
    botName = data.botName;
    document.getElementById('bot-name-display').innerText = botName;
}

async function sendMessage() {
    const input = document.getElementById('user-input');
    const text = input.value;
    if (!text) return;

    appendMessage('user', text);
    input.value = '';
    document.getElementById('typing').style.display = 'block';

    const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            message: text, 
            token: localStorage.getItem('token') 
        })
    });

    const data = await res.json();
    document.getElementById('typing').style.display = 'none';
    appendMessage('bot', data.reply);
}

function appendMessage(role, text) {
    const div = document.createElement('div');
    div.className = `msg ${role}`;
    div.innerText = role === 'user' ? `You: ${text}` : `${botName}: ${text}`;
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function clearChat() { messagesDiv.innerHTML = ''; }

function toggleAuth() {
    const m = document.getElementById('auth-modal');
    m.style.display = m.style.display === 'none' ? 'flex' : 'none';
}

async function handleAuth(type) {
    const email = document.getElementById('email').value;
    const password = document.getElementById('pass').value;
    const res = await fetch(`/api/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.token) {
        localStorage.setItem('token', data.token);
        alert("Logged in!");
        toggleAuth();
    } else {
        alert(data.message || "Success! Now Login.");
    }
}

init();
