require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OpenAI } = require('openai');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- MODELS ---
const User = mongoose.model('User', new mongoose.Schema({
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true }
}));

const Chat = mongoose.model('Chat', new mongoose.Schema({
    userId: String,
    role: String,
    content: String,
    timestamp: { type: Date, default: Date.now }
}));

const Settings = mongoose.model('Settings', new mongoose.Schema({
    botName: { type: String, default: 'Pratik-AI' }
}));

// --- MIDDLEWARE ---
const auth = (req, res, next) => {
    const token = req.headers.authorization;
    if (!token) return res.status(401).send('Access Denied');
    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) { res.status(400).send('Invalid Token'); }
};

// --- AUTH ROUTES ---
app.post('/api/signup', async (req, res) => {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user = new User({ email: req.body.email, password: hashedPassword });
    await user.save();
    res.send({ message: "User Created" });
});

app.post('/api/login', async (req, res) => {
    const user = await User.findOne({ email: req.body.email });
    if (user && await bcrypt.compare(req.body.password, user.password)) {
        const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET);
        res.json({ token, email: user.email });
    } else { res.status(400).send('Invalid Credentials'); }
});

// --- CHAT LOGIC ---
app.get('/api/settings', async (req, res) => {
    let s = await Settings.findOne();
    if (!s) s = await Settings.create({ botName: 'Pratik-AI' });
    res.json(s);
});

app.post('/api/chat', async (req, res) => {
    const { message, token } = req.body;
    let userId = 'guest';

    if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
    }

    if (message.toLowerCase().includes('who made you') || message.toLowerCase().includes('developer')) {
        return res.json({ reply: "I was created by Pratik" });
    }

    const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: message }],
    });

    const aiReply = response.choices[0].message.content;

    if (userId !== 'guest') {
        await Chat.create({ userId, role: 'user', content: message });
        await Chat.create({ userId, role: 'assistant', content: aiReply });
    }

    res.json({ reply: aiReply });
});

// --- ADMIN ROUTES ---
app.post('/api/admin/login', (req, res) => {
    if (req.body.email === process.env.ADMIN_EMAIL && req.body.password === process.env.ADMIN_PASSWORD) {
        const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET);
        res.json({ token });
    } else { res.status(401).send('Unauthorized'); }
});

app.get('/api/admin/stats', async (req, res) => {
    const users = await User.find({}, '-password');
    const chats = await Chat.find();
    res.json({ userCount: users.length, users, chats });
});

app.post('/api/admin/update-bot', async (req, res) => {
    await Settings.findOneAndUpdate({}, { botName: req.body.botName });
    res.send("Updated");
});

app.delete('/api/admin/user/:id', async (req, res) => {
    await User.findByIdAndDelete(req.params.id);
    res.send("Deleted");
});

mongoose.connect(process.env.MONGO_URI).then(() => {
    app.listen(process.env.PORT, () => console.log('Server running on port ' + process.env.PORT));
});
