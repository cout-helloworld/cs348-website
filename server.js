const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

app.get(['/', '/index.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/report.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'report.html'));
});

app.get('/data-management.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'data-management.html'));
});

app.post('/add-manuscript', addManuscriptController);
app.post('/edit-manuscript', editManuscriptController);
app.post('/delete-manuscript', deleteManuscriptController);

function addManuscriptController(req, res) {
    const {author_id, title, publication_date, description, location, availability_status } = req.body;
    const sql = `
        INSERT INTO manuscripts (author_id, title, publication_date, description, location, availability_status)
        VALUES (?, ?, ?, ?, ?, ?)`;

    db.run(sql, [author_id, title, publication_date, description, location, availability_status], function(err) {
        if (err) {
            return res.status(500).send('Error adding manuscript');
        }
        res.redirect('/data-management.html');
    });
}

function editManuscriptController(req, res) {
    const { book_id_edit, title, author, publication_date, description, location, availability_status } = req.body;
    const sql = `
        UPDATE manuscripts
        SET title = ?, author = ?, publication_date = ?, description = ?, location = ?, availability_status = ?
        WHERE book_id = ?`;

    db.run(sql, [title, author, publication_date, description, location, availability_status, book_id_edit], function(err) {
        if (err) {
            return res.status(500).send('Error editing manuscript');
        }
        res.redirect('/data-management.html');
    });
}

function deleteManuscriptController(req, res) {
    const { book_id_delete } = req.body;
    const sql = 'DELETE FROM manuscripts WHERE book_id = ?';

    db.run(sql, [book_id_delete], function(err) {
        if (err) {
            return res.status(500).send('Error deleting manuscript');
        }
        res.redirect('/data-management.html'); // Redirect to data management page
    });
}

app.get('/manuscripts', (req, res) => {
    db.all('SELECT * FROM manuscripts', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
}); 
  
app.get('/query', (req, res) => {
    const manuscript_id = req.query.manuscript_id;
    if (!manuscript_id) {
      return res.status(400).json({ error: 'Manuscript ID not provided' });
    }
  
    db.all('SELECT * FROM manuscript_history WHERE manuscript_id = ?', [manuscript_id], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

app.get('/query2', (req, res) => {
    const manuscript_id = req.query.manuscript_id;
    if (!manuscript_id) {
        return res.status(400).json({ error: 'Manuscript ID not provided' });
    }

    db.all('SELECT * FROM reservations WHERE manuscript_id = ?', [manuscript_id], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});
