const express = require("express");
const app = express();

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', './views');

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

// GET route for the index page
app.get('/', async (req, res) => {
    try {
        // Query the database to fetch data
        const data = await knex('users').select('*'); // Replace 'users' with your table name

        // Render the EJS file and pass the data
        res.render('index', { data });
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).send('An error occurred while fetching data.');
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
