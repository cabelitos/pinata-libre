export interface EventRawBody {
  team_id: string;
}

interface InteractionResponseHandlerArgs {
  delete_original?: boolean;
  replace_original?: boolean;
  response_type?: string | null | undefined;
  text?: string | null | undefined;
  thread_ts?: string | null | undefined;
}

export type InteractionResponseHandler = (
  arg: InteractionResponseHandlerArgs,
) => void;
