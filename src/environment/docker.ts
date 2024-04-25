import Docker from "dockerode";

const docker = new Docker({
    protocol: 'http',
    host: process.env.DOCKER_HOST ?? 'localhost',
    port: process.env.DOCKER_PORT ?? 2375
});

export default docker;
