import { run, select, selectWith } from "$sql";
import { translateCourt, createCourt, selectNewestCourtId } from "$sql/orm";
import { StatusCode } from "@internal/enums";
import { ApiFn, createHandler } from "$/api";

const get: ApiFn = async ({ response }) => {
  const items = (await selectWith(
    translateCourt
  )`select * from court order by created_at desc`) as [];

  return response.status(StatusCode.Ok).json({ items, total: items.length });
};

const post: ApiFn = async ({ request, response }) => {
  const { body } = request;

  await run(createCourt(body));
  const [{ id, created_at }] = await select(selectNewestCourtId());

  await response.status(StatusCode.Created).json({
    message: `successfully created new resource '${id}'.`,
    createdAt: created_at,
  });
};

export default createHandler({ get, post });
