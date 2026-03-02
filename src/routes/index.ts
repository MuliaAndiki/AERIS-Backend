import { Elysia, t } from "elysia";
import { getPosts, CreatePost } from "../controllers/PostController";
const Routes = new Elysia({ prefix: "/posts" })
  .get("/", () => getPosts())
  .post("/", async ({ body }) => await CreatePost(body), {
    body: t.Object({
      title: t.String({ minLength: 4, maxLength: 100 }),
      content: t.String({ minLength: 4, maxLength: 100 }),
    }),
  });

export default Routes;
