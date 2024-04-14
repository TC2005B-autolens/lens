import express from 'express';
import redis from 'redis';

const app = express();
const port = 3000;

// Create a new redis client and connect to our local redis instance
const client = redis.createClient({
    url: 'redis://redis:6379',
});

await client.connect();
console.log("Connected");
client.set('greeting', 'Hello World 2.0');

client.on('error', (err) => {
    console.log("Redis error: " + err);
});

process.on('SIGTERM', () => {
    console.log("Received SIGTERM");
    console.log("Closing redis connection");
    client.quit();
    process.exit(0);
});

app.get('/', async (req, res) => {
    let greeting = await client.get('greeting');
    res.send(greeting);
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});