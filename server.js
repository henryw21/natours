const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });
const mongoose = require('mongoose');

process.on('uncaughtException', err => {
    console.log('---Uncaught Exception error occurred---');
    console.log(`Name of the error: ${err.name}`);
    console.log(`Error message: ${err.message}`);
    console.log('Server exiting...');
    process.exit(1);
});

const app = require('./app');

const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);

mongoose
    .connect(DB, { useNewUrlParser: true, useCreateIndex: true, useFindAndModify: false, useUnifiedTopology: true })
    .then(() => {
        console.log(`Database successfully connected since ${new Date().toLocaleString()}`);
    });
// .catch(err => {
//     console.log(err);
// });

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
    console.log(`Server (${process.env.NODE_env} mode) running on ${port} since ${new Date().toLocaleString()}`);
});

process.on('unhandledRejection', err => {
    console.log('---Unhandled rejection error occurred---');
    console.log(`Name of the error: ${err.name}`);
    console.log(`Error message: ${err.message}`);
    console.log('Server exiting...');
    server.close(() => {
        process.exit(1);
    });
});
