import z from "zod/v4";
import sz from "./src";
import { RecordId } from "surrealdb";

const idType = sz.recordId(["client", "admin", "user"]); // .type(z.any());
// z.parse(idType, new RecordId("test", "123"));

const User = sz
  .table("user")
  .schemafull()
  .fields({
    id: sz.recordId("test").type(z.string()),
    name: sz.string(),
  })
  .comment("This table contains user information");

const Client = sz
  .table("client")
  .schemafull()
  .fields({
    id: sz.recordId("test").type(z.string()),
    name: sz.string(),
    tracker: User.record(),
  })
  .comment("This table contains client information");

const parsedUser = z.safeParse(User, {
  id: new RecordId("user", "123"),
  name: "John Doe",
});
parsedUser.data;
console.log(parsedUser);
console.log("-".repeat(80));

const parsedClient = z.safeParse(Client, {
  id: new RecordId("client", "123"),
  name: "John Doe",
  tracker: new RecordId("user", "123"),
});
console.log(parsedClient);
console.log("-".repeat(80));
