import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import playlistRouter from './routes/playlists.js';
import filterRouter from './routes/filter.js';

const app = express();
app.use(cors());
app.use(express.json());

// Mount routes

app.use('/auth', authRouter);
app.use('/playlists', playlistRouter);
app.use('/filter', filterRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
