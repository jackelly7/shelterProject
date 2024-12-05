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
app.use(express.static('public'));



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


// app.get("/", (req, res) => {
//     res.render("index");
// });

app.get("/", async (req, res) => {
    try {
      let adminName;
  
      // Check if the user is logged in and has an admin role
      if (req.session.userId && req.session.role === 'admin') {
        const adminDetails = await knex('admins')
          .join('users', 'admins.user_id', 'users.user_id')
          .select('admins.admin_first_name')
          .where('users.user_id', req.session.userId)
          .first();
  
        if (adminDetails) {
          adminName = adminDetails.admin_first_name;
        }
      }
  
      // Render index.ejs and pass adminName (null if not logged in)
      res.render("index", { adminName });
    } catch (error) {
      console.error("Error fetching admin details:", error);
      res.status(500).send("Server error");
    }
  });

// Meet Jen Page
app.get("/meet_jen", (req, res) => {
    res.render("meet_jen");
});

// Login Page
app.get("/login", (req, res) => {
    res.render("login"); // Render 'login.ejs'
});

// Admin Event Manager Page
// Admin Event Manager Page
app.get("/event_manager", authMiddleware, isAdmin, (req, res) => {
  // Fetch events based on the event_status
  knex('events')
    .select('*')
    .then(result => {
      // Separate events by status
      const approvedEvents = result.filter(event => event.event_status === 'approved');
      const pendingEvents = result.filter(event => event.event_status === 'pending');
      const declinedEvents = result.filter(event => event.event_status === 'declined');
      const completedEvents = result.filter(event => event.event_status === 'completed');

      // Render the event manager page with the separated event data
      res.render("event_manager", {
        approvedEvents,
        pendingEvents,
        declinedEvents,
        completedEvents
      });
    })
    .catch(error => {
      console.error('Error fetching events:', error);
      res.status(500).send('Something went wrong');
    });
});

//edit_events GET route
app.get('/edit_events/:eventId', async (req, res) => {
  const eventId = req.params.eventId;
  try {
    const events= await knex('events').where({ "event_id": eventId }).first();
    if (!events) {
      return res.status(404).send('Event not found');
    }
    const stateAbbreviations = [
      'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
      'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
      'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
      'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
      'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
    ];
    res.render('edit_events', { events, stateAbbreviations });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

//edit_events POST route
app.post('/edit_events/:event_id', async (req, res) => {
  const eventId = req.params.event_id;
  const eventData = req.body;

  try {
    // Update the event using Knex
    await knex('events')
      .where({ event_id: eventId })
      .update({
        event_name: eventData.event_name,
        event_date_time: eventData.event_date_time,
        event_city: eventData.event_city,
        event_county: eventData.event_county,
        event_state: eventData.event_state,
        event_street_address: eventData.event_street_address,
        event_zip: eventData.event_zip,
        event_duration_hrs: eventData.event_duration_hrs,
        number_of_participants_expected: eventData.number_of_participants_expected,
        event_type: eventData.event_type,
        event_contact_phone: eventData.event_contact_phone,
        event_contact_email: eventData.event_contact_email,
        event_jen_story: eventData.event_jen_story === 'true', // convert to boolean
        event_donate_money: eventData.event_donate_money === 'true' // convert to boolean
      });

    res.redirect('/event_manager');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

// Delete Event
app.get('/delete_event/:event_id', async (req, res) => {
  const eventId = req.params.event_id;
  await db.query('DELETE FROM events WHERE event_id = $1', [eventId]);
  res.redirect('/event_manager');
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
        res.redirect("/");
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

const stateAbbreviations = ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"];

//GET route for event page
app.get('/request_event', (req, res) => {
  knex('events').select('*')
    .then(result => {
      res.render('request_event', { events: result, stateAbbreviations: stateAbbreviations });
    })
    .catch(error => {
      console.error('Error fetching events:', error);
      res.status(500).send('Something went wrong');
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



































