import { Hono } from "hono";
import { mistralEndpoint } from './endpoints/mistral';

const app = new Hono<{ Bindings: Env }>();

app.route('/api', mistralEndpoint);

export default app;
