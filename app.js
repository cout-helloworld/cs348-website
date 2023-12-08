const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite',
});

// ORM model for manuscripts
const Manuscripts = sequelize.define('manuscripts', {
    manuscript_id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
    },
    author_id: {
      type: DataTypes.INTEGER
    },
    title: {
        type: DataTypes.STRING
    }, 
    publication_date: {
        type: DataTypes.STRING
    },
    description: {
        type: DataTypes.STRING
    }, 
    location: {
        type: DataTypes.STRING
    },
    availability_status: {
        type: DataTypes.STRING
    }
},{
    timestamps: false
});

app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

// home page
app.get(['/', '/index.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// report page
app.get('/report.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'report.html'));
});

// data management page
app.get('/data-management.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'data-management.html'));
});

// routes to add/edit/delete data
app.post('/add-edit-manuscript', addEditManuscriptController);
app.post('/delete-manuscript', deleteManuscriptController);

// this function adds and deletes data
async function addEditManuscriptController(req, res) {
    const { manuscript_id, author_id, title, publication_date, description, location, availability_status } = req.body;
    if (!manuscript_id) { // if the manuscript ID is not specified, then add a manuscript. Edit the specified manuscript otherwise.
        try {
            const manuscript = await Manuscripts.create({ // use ORM model
                author_id,
                title,
                publication_date,
                description,
                location,
                availability_status,
            });
            res.redirect('/data-management.html');
        } catch (error) {
            console.error('Error adding manuscript:', error);
            res.status(500).send('Error adding manuscript');
        }
    }
    else { // Edit manuscript
        try {
            const updatedCount = await Manuscripts.update( // use ORM model
                {
                    title,
                    author_id,
                    publication_date,
                    description,
                    location,
                    availability_status,
                }, { where: { manuscript_id } } );
    
            if (updatedCount > 0) return res.redirect('/data-management.html'); // if nothing was updated, return error
            else return res.status(404).send('Manuscript not found.');
        } catch (error) {
            console.error('Error editing manuscript:', error);
            res.status(500).send('Error editing manuscript.');
        }
    }
}

async function deleteManuscriptController (req, res) {
    const { manuscript_id_delete } = req.body;
    try {
        const deletedCount = await Manuscripts.destroy({ // delete a manuscript with an ORM
            where: {
                manuscript_id: manuscript_id_delete,
            },
        });

        if (deletedCount > 0) { // if a manuscript was not deleted, return an error
            return res.redirect('/data-management.html');
        } else {
            return res.status(404).send('Manuscript not found.');
        }
    } catch (error) {
        console.error('Error deleting manuscript:', error);
        res.status(500).send('Error deleting manuscript.');
    }
};

// get all manuscripts. Uses raw SQL, but there is no user input/injection threat
app.get('/manuscripts', (req, res) => {
    db.all('SELECT * FROM manuscripts', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
}); 

// gets all manuscript events in a date range. Uses prepared statements
app.get('/query', (req, res) => {
    const manuscript_id = req.query.manuscript_id;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
   
    if (!manuscript_id) {
        return res.status(400).json({ error: 'Manuscript ID not provided' });
    }
  
    let sql = 'SELECT * FROM manuscript_history WHERE manuscript_id = ?';
    let params = [manuscript_id];

    if (startDate != "" && endDate != "") {
        sql += ' AND (event_date >= ? AND event_date <= ?)';
        params.push(startDate, endDate);
    } else if (startDate != "") {
        sql += ' AND event_date >= ?';
        params.push(startDate);
    } else if (endDate != "") {
        sql += ' AND event_date <= ?';
        params.push(endDate);
    }

    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// gets all manuscript reservations within a certain date. Uses prepared statements
app.get('/query2', (req, res) => {
    const manuscript_id = req.query.manuscript_id;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
   
    if (!manuscript_id) {
        return res.status(400).json({ error: 'Manuscript ID not provided' });
    }
  
    let sql = 'SELECT * FROM reservations WHERE manuscript_id = ?';
    let params = [manuscript_id];

    if (startDate != "" && endDate != "") {
        sql += ' AND (reservation_date >= ? AND reservation_date <= ?)';
        params.push(startDate, endDate);
    } else if (startDate != "") {
        sql += ' AND reservation_date >= ?';
        params.push(startDate);
    } else if (endDate != "") {
        sql += ' AND reservation_date <= ?';
        params.push(endDate);
    }

    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// gets the average time per reservation for the specified manuscript. Uses a prepared statement
app.get('/avg_res', (req, res) => {
    const manuscript_id = req.query.manuscript_id;
    if (!manuscript_id) {
        return res.status(400).json({ error: 'Manuscript ID not provided' });
    }

    db.all('SELECT avg(abs(julianday(pickup_date) - julianday(actual_return_date))) as res FROM reservations WHERE manuscript_id = ?', [manuscript_id], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// gets the total time per reservation for the specified manuscript. Uses a prepared statement
app.get('/sum_res', (req, res) => {
    const manuscript_id = req.query.manuscript_id;
    if (!manuscript_id) {
        return res.status(400).json({ error: 'Manuscript ID not provided' });
    }

    db.all('SELECT sum(abs(julianday(pickup_date) - julianday(actual_return_date))) as res FROM reservations WHERE manuscript_id = ?', [manuscript_id], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// gets the number of days since the last damage event of a specified manuscript. Uses a prepared statement
app.get('/last_damage', (req, res) => {
    const manuscript_id = req.query.manuscript_id;
    if (!manuscript_id) {
        return res.status(400).json({ error: 'Manuscript ID not provided' });
    }

    db.all('SELECT (julianday(DATE(\'now\')) - max(julianday(event_date))) as res FROM manuscript_history WHERE manuscript_id = ? and event_description = \'DAMAGE\'', [manuscript_id], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// gets the number of days since the last restoration event of a specified manuscript. Uses a prepared statement
app.get('/last_res', (req, res) => {
    const manuscript_id = req.query.manuscript_id;
    if (!manuscript_id) {
        return res.status(400).json({ error: 'Manuscript ID not provided' });
    }

    db.all('SELECT (julianday(DATE(\'now\')) - max(julianday(event_date))) as res FROM manuscript_history WHERE manuscript_id = ? and event_description = \'RESTORATION\'', [manuscript_id], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});