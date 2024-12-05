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

//event_production_report
app.get('/event-production-report', async (req, res) => {
    try {
        const completedEvents = await knex('events as e')
            .leftJoin('event_production as ep', 'e.event_id', 'ep.event_id')
            .select(
                'e.event_id',
                'e.event_name',
                'e.event_type',
                'e.number_of_participants_expected',
                'e.event_date_time',
                'e.event_city',
                'e.event_state',
                'e.event_jen_story',
                'e.event_contact_first_name',
                'e.event_contact_last_name',
                'e.event_contact_phone',
                'ep.item_count',
                'ep.total_attendees_actual',
                'ep.event_duration_actual'
            )
            .where('e.event_status', 'completed');

        res.render('event_production_report', { completedEvents });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching completed events.');
    }
});

//update event production
// GET route to render the form
app.get('/update-event-production/:event_id', async (req, res) => {
    const eventId = req.params.event_id;

    try {
        const event = await knex('events')
            .leftJoin('event_production', 'events.event_id', 'event_production.event_id')
            .select(
                'events.event_id',
                'events.event_name',
                'event_production.item_count',
                'event_production.total_attendees_actual',
                'event_production.event_duration_actual'
            )
            .where('events.event_id', eventId)
            .first();

        if (!event) {
            return res.status(404).send('Event not found.');
        }

        res.render('update_event_production', { event });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching event production details.');
    }
});

// POST route to handle the form submission
app.post('/update-event-production/:event_id', (req, res) => {
    const eventId = req.params.event_id;
    const { inventory_name, inventory_size, item_count, total_attendees_actual, event_duration_actual } = req.body;

    // Fetch the inventory_id based on inventory_name and inventory_size
    knex('inventory')
        .where({ inventory_name, inventory_size })
        .first()
        .then(inventory => {
            if (!inventory) {
                return res.status(400).send('Invalid inventory selection.');
            }
            const inventory_id = inventory.inventory_id;
            const current_inventory_quantity = inventory.inventory_quantity; // Get current inventory quantity

            // Calculate the new inventory quantity
            const new_inventory_quantity = current_inventory_quantity + parseInt(item_count);

            // Start a transaction to update both the inventory and event_production tables
            return knex.transaction(trx => {
                // Update the inventory table with the new inventory quantity
                return trx('inventory')
                    .where('inventory_id', inventory_id)
                    .update({
                        inventory_quantity: new_inventory_quantity
                    })
                    .then(() => {
                        // Check if the event_production record exists
                        return trx('event_production')
                            .where({ event_id: eventId, inventory_id: inventory_id })
                            .first()
                            .then(eventProduction => {
                                if (eventProduction) {
                                    // If the record exists, update the values
                                    return trx('event_production')
                                        .where({ event_id: eventId, inventory_id: inventory_id })
                                        .update({
                                            item_count: eventProduction.item_count + parseInt(item_count),
                                            total_attendees_actual,
                                            event_duration_actual
                                        });
                                } else {
                                    // If the record doesn't exist, insert a new one
                                    return trx('event_production')
                                        .insert({
                                            event_id: eventId,
                                            inventory_id: inventory_id,
                                            item_count: item_count,
                                            total_attendees_actual,
                                            event_duration_actual
                                        });
                                }
                            });
                    });
            })
            .then(() => {
                res.redirect('/event-production-report');
            })
            .catch(err => {
                console.error('Error updating event production:', err);
                res.status(500).send('Error updating event production.');
            });
        })
        .catch(err => {
            console.error('Error querying inventory:', err);
            res.status(500).send('Error querying inventory.');
        });
});




// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});



































