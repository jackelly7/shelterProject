const express = require("express");
const app = express();
let path = require('path');
require('dotenv').config();

const knex = require('knex') ({
    client : 'pg',
    connection : {
        host : process.env.DB_HOST || 'localhost',
        user : process.env.DB_USER,
        password : process.env.DB_PASSWORD,
        database : process.env.DB_NAME,
        port : process.env.DB_PORT || 5432
    }
})

// Middleware to parse POST request bodies
app.use(express.urlencoded({ extended: true }));

// -----> Connect Database here

// Set view engine and views folder
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

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

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
