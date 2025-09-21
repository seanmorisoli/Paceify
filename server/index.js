import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import playlistRoutes from './routes/playlists.js';
import filterRoutes from './routes/filter.js';

const app = express();
app.use(cors());
app.use(express.json());

// Mount routes
app.use('/auth', authRoutes);
app.use('/playlists', playlistRoutes);
app.use('/filter', filterRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
