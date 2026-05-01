require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

app.use(cors());
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
});

// Create tables and seed 50 5-letter words
app.get('/api/init-db', async (req, res) => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS Word (
                id SERIAL PRIMARY KEY,
                word VARCHAR(5) NOT NULL UNIQUE
            );
            
            CREATE TABLE IF NOT EXISTS GameHistory (
                id SERIAL PRIMARY KEY,
                target_word VARCHAR(5) NOT NULL,
                attempts INT NOT NULL,
                is_win BOOLEAN NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Need to seed 50 5-letter words
        const words = ['APPLE', 'BERRY', 'CRANE', 'DANCE', 'EAGLE', 'FLAME', 'GRAPE', 'HOUSE', 'IGLOO', 'JUICE',
            'KNIFE', 'LEMON', 'MONEY', 'NIGHT', 'OCEAN', 'PIZZA', 'QUICK', 'RIVER', 'SNAKE', 'TIGER',
            'UNCLE', 'VOICE', 'WATER', 'XENON', 'YACHT', 'ZEBRA', 'BRAVE', 'CLEAN', 'DREAM', 'EARTH',
            'FRESH', 'GHOST', 'HEART', 'IMAGE', 'JUMBO', 'KINGS', 'LIGHT', 'MAGIC', 'NOBLE', 'ONION',
            'PANIC', 'QUEEN', 'RIGHT', 'SMART', 'TRAIN', 'UNION', 'VIVID', 'WORLD', 'YOUTH', 'ZESTY'];

        const values = words.map(w => `('${w}')`).join(',');
        await pool.query(`
            INSERT INTO Word (word) VALUES ${values}
            ON CONFLICT (word) DO NOTHING;
        `);

        res.json({ message: 'Database initialized and seeded successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to initialize database' });
    }
});

app.get('/api/word/random', async (req, res) => {
    try {
        const result = await pool.query('SELECT word FROM Word ORDER BY RANDOM() LIMIT 1');
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'No words found' });
        }
        res.json({ success: true, word: result.rows[0].word });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Error fetching random word' });
    }
});

app.post('/api/history', async (req, res) => {
    try {
        const { targetWord, attempts, isWin } = req.body;
        const result = await pool.query(
            'INSERT INTO GameHistory (target_word, attempts, is_win) VALUES ($1, $2, $3) RETURNING *',
            [targetWord, attempts, isWin]
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Error saving history' });
    }
});

app.get('/api/history', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM GameHistory ORDER BY created_at DESC');
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Error fetching history' });
    }
});

app.delete('/api/history', async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({ success: false, message: 'ID is required' });
        }
        await pool.query('DELETE FROM GameHistory WHERE id = $1', [id]);
        res.json({ success: true, message: 'History deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error deleting history' });
    }
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(3000, () => console.log('Listening on 3000'));
}
module.exports = app;
