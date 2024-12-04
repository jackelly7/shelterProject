const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const path = require("path");
require("dotenv").config();

const app = express();
const bodyParser = require("body-parser");
const port = 3000;

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
        cookie: {
            secure: process.env.NODE_ENV === "production",
            httpOnly: true,
        },
    })
);

// Set view engine and views folder
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Serve static files (like CSS)
app.use(express.static(path.join(__dirname, "public")));

// Middleware for protected routes
function authMiddleware(req, res, next) {
    if (!req.session.userId) {
        return res.redirect("/login");
    }
    next();
}

function isAdmin(req, res, next) {
    if (req.session.role === "admin") {
        next();
    } else {
        res.status(403).send("Access denied");
    }
}

function isVolunteer(req, res, next) {
    if (req.session.role === "volunteer") {
        next();
    } else {
        res.status(403).send("Access denied");
    }
}

// -----> Routes

// Homepage
app.get("/", (req, res) => {
    res.render("index");
});

// Meet Jen Page
app.get("/meet_jen", (req, res) => {
    res.render("meet_jen");
});

// Login Page
app.get("/login", (req, res) => {
    res.render("login");
});

// Login Route
app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await knex("users")
            .where({ username, user_password: password })
            .first();

        if (!user) {
            console.log("Invalid username or password");
            return res.status(401).send("Invalid username or password");
        }

        // Set session variables
        req.session.userId = user.user_id;
        req.session.role = user.user_type;

        // Redirect based on role
        res.redirect(user.user_type === "admin" ? "/admin" : "/volunteer");
    } catch (err) {
        console.error("Error during login:", err);
        res.status(500).send("Server error");
    }
});

// Admin-only route
// app.get("/admin", authMiddleware, isAdmin, (req, res) => {
//     res.render("admin");
// });

app.get('/admin', authMiddleware, isAdmin, async (req, res) => {
    try {
        const adminDetails = await knex('admins')
            .join('users', 'admins.user_id', 'users.user_id')
            .select('admins.admin_first_name')
            .where('users.user_id', req.session.userId)
            .first();
  
        if (!adminDetails) {
            return res.status(404).send('Admin details not found');
        }
  
        res.render('admin', { adminName: adminDetails.admin_first_name });
  
    } catch (error) {
        console.error('Error fetching admin details:', error);
        res.status(500).send('Server error');
    }
  });

// Volunteer-only route
app.get("/volunteer", authMiddleware, isVolunteer, (req, res) => {
    res.render("volunteer");
});

// Logout Route
app.get("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Error during logout:", err);
            return res.status(500).send("Server error");
        }
        res.clearCookie("connect.sid");
        res.redirect("/login");
    });
});

// Register New User (For testing purposes only)
app.post("/register", async (req, res) => {
    const { username, password, user_type } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        await knex("users").insert({
            username,
            user_password: hashedPassword,
            user_type,
        });
        res.send("User registered successfully!");
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).send("Server error");
    }
});

// GET route for event page
app.get("/request_event", authMiddleware, (req, res) => {
    knex("events")
        .select("*")
        .then((result) => {
            res.render("request_event", { events: result });
        })
        .catch((error) => {
            console.error("Error fetching events:", error);
            res.status(500).send("Something went wrong");
        });
});

// POST route to request an event
app.post("/request_event", authMiddleware, (req, res) => {
    const {
        event_name,
        number_of_participants_expected,
        event_type,
        event_date_time,
        event_street_address,
        event_city,
        event_county,
        event_state,
        event_zip,
        event_duration_hrs,
        event_contact_first_name,
        event_contact_last_name,
        event_contact_phone,
        event_contact_email,
        event_jen_story,
        event_donate_money,
    } = req.body;

    knex("events")
        .insert({
            event_name,
            number_of_participants_expected,
            event_type,
            event_date_time,
            event_street_address,
            event_city,
            event_county,
            event_state,
            event_zip,
            event_duration_hrs,
            event_contact_first_name,
            event_contact_last_name,
            event_contact_phone,
            event_contact_email,
            event_jen_story,
            event_donate_money,
            event_status: "pending",
        })
        .then(() => {
            res.redirect("/request_event");
        })
        .catch((error) => {
            console.error("Error inserting event:", error);
            res.status(500).send("Something went wrong");
        });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
