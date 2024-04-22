import type { Application, IRouter, RequestHandler } from "express";
import { Router } from "express";
import createHttpError from "http-errors";

export interface APIRoute {
    path: string;
    get?: RequestHandler;
    post?: RequestHandler;
    put?: RequestHandler;
    patch?: RequestHandler;
    delete?: RequestHandler;
}

export interface APIRouter {
    routes: APIRoute[];
    path: string;
    middlewares?: RequestHandler[];
}

export function router(r: APIRouter): Router {
    const routes = r.routes;
    const router = Router();
    routes.forEach((route) => {
        const { path, get, post, put, patch, delete: del } = route;
        if (get) router.get(path, get);
        if (post) router.post(path, post);
        if (put) router.put(path, put);
        if (patch) router.patch(path, patch);
        if (del) router.delete(path, del);
        router.all(path, (_req, _res, next) => {
            next(new createHttpError.MethodNotAllowed());
        });
    });
    if (r.middlewares) {
        r.middlewares.forEach((middleware) => {
            router.use(middleware);
        });   
    }
    return router;
}
