let express = require('express');
let app = express();

let path = require('path');

const port = 5000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({extended: true}));      // lets you access the body of the request

const knex = require('knex') ({
    client : 'pg',
    connection : {
        host : 'localhost',
        user : 'postgres',
        password : 'Pinacolada17',
        database : 'starwars',
        port : 5432
    }
})

// Route to display Character records
app.get('/', (req, res) => {
    knex('characters')
      .join('planets', 'characters.id', '=', 'planets.id')
      .select(
        'characters.id',
        'characters.last_name',
        'characters.first_name',
        'planets.planet_name',
      )
      .orderBy('characters.last_name', 'asc')
      .orderBy('characters.first_name', 'asc')
      .then(jedi => {
        // Render the index.ejs template and pass the data
        res.render('index', { jedi });
      })
      .catch(error => {
        console.error('Error querying database:', error);
        res.status(500).send('Internal Server Error');
      });
  });





  app.get('/editJedi/:id', (req, res) => {
    let id = req.params.id;
    // Query the characters by ID first
    knex('characters')
      .where('id', id)
      .first()
      .then(jedi => {
        if (!jedi) {
          return res.status(404).send('Jedi not found');
        }
        // Query all characters types after fetching the Jedi
        knex('planets')
          .select('id', 'planet_name')
          .then(planets => {
            // Render the edit form and pass both characters and planets
            res.render('editJedi', { jedi, planets });
          })
          .catch(error => {
            console.error('Error fetching Jedi:', error);
            res.status(500).send('Internal Server Error');
          });
      })
      .catch(error => {
        console.error('Error fetching Jedi for editing:', error);
        res.status(500).send('Internal Server Error');
      });
  });

  app.post('/editJedi/:id', (req, res) => {
    const id = req.params.id;
    // Access each value directly from req.body
    const first_name = req.body.first_name;
    const last_name = req.body.last_name; // Convert to integer
    const planet_name = req.body.planet_name;
    // If it is unchecked, no value is sent to the server.
    // This behavior requires special handling on the server-side to set a default
    const jedi = req.body.jedi === 'true'; // Convert checkbox value to boolean
    const weapon = req.body.weapon;
    // Update the Character in the database
    knex('characters')
      .where('id', id)
      .update({
        first_name: first_name,
        last_name: last_name,
        planet_name: planet_name,
        jedi: jedi,
        weapon: weapon,
      })
      .then(() => {
        res.redirect('/'); // Redirect to the list of Character after saving
      })
      .catch(error => {
        console.error('Error updating Jedi:', error);
        res.status(500).send('Internal Server Error');
      });
  });

  app.post('/deleteJedi/:id', (req, res) => {
    const id = req.params.id;
    knex('characters')
      .where('id', id)
      .del() // Deletes the record with the specified ID
      .then(() => {
        res.redirect('/'); // Redirect to the Character list after deletion
      })
      .catch(error => {
        console.error('Error deleting Jedi:', error);
        res.status(500).send('Internal Server Error');
      });
  });

  app.get('/addJedi', (req, res) => {
    knex('planets') // Query the database for Character types
      .select('id', 'planet_name') // Select only the necessary fields
      .then(planets => {
        res.render('addJedi', { planets }); // Render the form with the retrieved types
      })
      .catch(error => {
        console.error('Error fetching Planets:', error);
        res.status(500).send('Internal Server Error'); // Handle errors gracefully
      });
  });
  
    // Insert new Character into the database
    app.post('/addJedi', (req, res) => {
      const { first_name, last_name, planet_name, jedi, weapon } = req.body;
    
      // Insert the new Character with the current date for `date_created`
      knex('characters')
        .insert({
          first_name,
          last_name,
          planet_name, // Automatically set the current date
          jedi: jedi === 'true', // Convert checkbox value to boolean
          weapon
        })
        .then(() => {
          res.redirect('/'); // Redirect to the main page after insertion
        })
        .catch(error => {
          console.error('Error adding Character:', error);
          res.status(500).send('Internal Server Error');
        });
    });
    
    app.get('/maintainPlanets', (req, res) => {
        knex('planets') // Query the database
          .select('id', 'planet_name') // Select only the necessary fields
          .then(planets => {
            res.render('maintainPlanets', { planets }); // Render the form with the retrieved types
          })
          .catch(error => {
            console.error('Error fetching Planets:', error);
            res.status(500).send('Internal Server Error'); // Handle errors gracefully
          });
      });
    
  app.get('/editPlanet/:id', (req, res) => {
    let id = req.params.id;
    knex('planets')
        .select('id', 'planet_name')
        .then(planets => {
        // Render the edit form and pass planets
        res.render('editPlanet', { planets });
        })
        .catch(error => {
        console.error('Error fetching Planet:', error);
        res.status(500).send('Internal Server Error');
        });
    });

  app.post('/editPlanet/:id', (req, res) => {
    const id = req.params.id;
    const planet_name = req.body.planet_name;
    knex('planets')
      .where('id', id)
      .update({
        planet_name: planet_name,
      })
      .then(() => {
        res.redirect('/'); // Redirect to the list of Character after saving
      })
      .catch(error => {
        console.error('Error updating Planet:', error);
        res.status(500).send('Internal Server Error');
      });
  });

  app.get('/addPlanet', (req, res) => {
    knex('planets') // Query the database for Character types
      .select('id', 'planet_name') // Select only the necessary fields
      .then(planets => {
        res.render('addPlanet', { planets }); // Render the form with the retrieved types
      })
      .catch(error => {
        console.error('Error fetching Planets:', error);
        res.status(500).send('Internal Server Error'); // Handle errors gracefully
      });
  });


      // Insert new Planet into the database
app.post('/addPlanet', (req, res) => {
    const { planet_name } = req.body;
  
    // Insert the new Planet
    knex('planets')
      .insert({
        planet_name
      })
      .then(() => {
        res.redirect('/'); // Redirect to the main page after insertion
      })
      .catch(error => {
        console.error('Error adding Planet:', error);
        res.status(500).send('Internal Server Error');
      });
  });

  app.post('/deletePlanet/:id', (req, res) => {
    const id = req.params.id;
    knex('planets')
      .where('id', id)
      .del() // Deletes the record with the specified ID
      .then(() => {
        res.redirect('/'); // Redirect to the Character list after deletion
      })
      .catch(error => {
        console.error('Error deleting Planet:', error);
        res.status(500).send('Internal Server Error');
      });
  });

  

app.listen(port, () => console.log(`listening on ${port}!!`));