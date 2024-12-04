const express = require("express");
const app = express();
const bodyParser = require('body-parser');
let path = require('path');
require('dotenv').config();
const port = 3000;

const knex = require('knex') ({
    client : 'pg',
    connection : {
        host : process.env.DB_HOST || 'localhost',
        user : process.env.DB_USER,
        password : process.env.DB_PASSWORD,
        database : process.env.DB_NAME,
        port : process.env.DB_PORT || 5432,
        ssl: { rejectUnauthorized: false }
    }
})

// Middleware to parse POST request bodies
app.use(express.urlencoded({ extended: true }));

// -----> Connect Database here

// Set view engine and views folder
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (like CSS)
app.use(express.static(path.join(__dirname, 'public')));

// Routes

app.get('/', (req, res) => {
    res.render('index');  // You can create an index.ejs to show your homepage
});

app.get('/meet_jen', (req, res) => {
    res.render('meet_jen'); // Render the 'meet-jen.ejs' file
});

app.get('/admin', (req, res) => {
    res.render('admin'); // Render the 'meet-jen.ejs' file
});


// Handle login form submission
app.post('/admin', (req, res) => {
    const { email, password } = req.body;

    // Add authentication logic here (e.g., check the database for the user)
    
    if (email === 'test@example.com' && password === 'password') {
        res.send('Logged in successfully!');
    } else {
        res.send('Invalid credentials.');
    }
});

//GET route for event page
app.get('/request_event', (req, res) => {
  knex('events').select('*')
    .then(result => {
      res.render('request_event', { events: result });
    })
    .catch(error => {
      console.error('Error fetching events:', error);
      res.status(500).send('Something went wrong');
    });
});

// POST route to request an event
app.post('/request_event', (req, res) => {
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
    event_donate_money
  } = req.body;

  knex('events').insert({
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
    event_status: "pending"  // Automatically set this to pending
  })
  .then(() => {
    res.redirect('/request_event');
  })
  .catch(error => {
    console.error('Error inserting event:', error);
    res.status(500).send('Something went wrong');
  });
});



// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});



































