// Containers used to run student code are on a bridge network that disables inter-container
// communication. For this reason, giving access to the API through a network is complicated.
// The workaround is to use a volume to share the socket file between the containers.
// This gives the added benefit that a different Express instance, with only select routes enabled,
// can be bound to the socket.

import express from "express";
import * as jobs from "./controllers/job";
import { errorHandler, zodErrorHandler } from "./middlewares/error-handler";

const app = express();

app.use(express.json());

app.use("/jobs/:jobid", jobs.provide);
app.post("/jobs/:jobid/result", jobs.postResult);

app.use(zodErrorHandler);
app.use(errorHandler);

app.use((_req, res) => {
    res.status(404).json({
        "message": "Not Found"
    });
});

export default app;
