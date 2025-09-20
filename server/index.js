const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const playlistRoutes = require('./routes/playlists');
const filterRoutes = require('./routes/filter');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/playlists', playlistRoutes);
app.use('/filter', filterRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
module.exports = app;
