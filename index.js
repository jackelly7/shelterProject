const express = require("express");
const session = require("express-session"); // For session management
const bcrypt = require("bcrypt"); // For secure password hashing
const path = require("path");
require("dotenv").config();

const app = express();

// Knex setup
const knex = require("knex")({
    client: "pg",
    connection: {
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 5432,
        ssl: { rejectUnauthorized: false },
    },
});

// Middleware to parse POST request bodies
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(
    session({
        secret: process.env.SESSION_SECRET || "yourSecretKey",
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false }, // Set to true if using HTTPS
    })
);

// Set view engine and views folder
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Serve static files (like CSS)
app.use(express.static(path.join(__dirname, "public")));

// Middleware for protected routes
function authMiddleware(req, res, next) {
    if (req.session.userId) {
        next(); // User is authenticated
    } else {
        res.redirect("/login"); // Redirect to login page
    }
}

function isAdmin(req, res, next) {
    if (req.session.role === 'admin') {
        next(); // User is an admin
    } else {
        res.status(403).send('Access denied'); // Forbidden
    }
}

function isVolunteer(req, res, next) {
    if (req.session.role === 'volunteer') {
        next(); // User is a volunteer
    } else {
        res.status(403).send('Access denied'); // Forbidden
    }
}

// -----> Routes

// Homepage
app.get("/", (req, res) => {
    res.render("index"); // Render 'index.ejs'
});

// Meet Jen Page
app.get("/meet_jen", (req, res) => {
    res.render("meet_jen"); // Render 'meet_jen.ejs'
});

// Login Page
app.get("/login", (req, res) => {
    res.render("login"); // Render 'login.ejs'
});

// Admin Page
app.get("/admin", (req, res) => {
    res.render("admin"); // Render 'admin.ejs'
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Query the database for a user with the given username and password
        const user = await knex('users')
            .where({ username, user_password: password })
            .first();

        // Check if a matching user was found
        if (!user) {
            console.log('Invalid username or password');
            return res.status(401).send('Invalid username or password');
        }

        // Store user details in session
        req.session.userId = user.user_id;
        req.session.role = user.user_type;

        // Redirect based on user role
        console.log('Login successful:', user);
        res.redirect(user.user_type === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
        console.error('Server error during login:', err);
        res.status(500).send('Server error');
    }
});

// Admin-only route
app.get('/admin', isAdmin, (req, res) => {
    res.render('admin'); // Render admin dashboard
});

// Volunteer-only route
app.get('/volunteer', isVolunteer, (req, res) => {
    res.render('volunteer'); // Render volunteer dashboard
});

// Shared route for both roles
app.get('/dashboard', (req, res) => {
    if (req.session.role === 'admin') {
        res.render('admin-dashboard'); // Admin-specific dashboard
    } else if (req.session.role === 'volunteer') {
        res.render('volunteer-dashboard'); // Volunteer-specific dashboard
    } else {
        res.redirect('/login'); // Redirect to login if no valid session
    }
});

// Logout Route
app.get("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).send("Server error");
        res.redirect("/login");
    });
});

// Register New User (For testing purposes only)
app.post("/register", async (req, res) => {
    const { email, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10); // Hash the password
        await knex("users").insert({ email, password: hashedPassword });
        res.send("User registered successfully!");
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});

// -----> Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
