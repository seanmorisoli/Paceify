<<<<<<< HEAD
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js'; // correct path
=======
const express = require('express');
const cors = require('cors');

const playlistRoutes = require('./routes/playlists');
const filterRoutes = require('./routes/filter');
>>>>>>> 3e2276bf064ae66288bf66e484911f423d753837

const app = express();
app.use(cors());
app.use(express.json());

<<<<<<< HEAD
// Mount auth routes
app.use('/auth', authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
=======
app.use('/playlists', playlistRoutes);
app.use('/filter', filterRoutes);


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
module.exports = app;
>>>>>>> 3e2276bf064ae66288bf66e484911f423d753837
