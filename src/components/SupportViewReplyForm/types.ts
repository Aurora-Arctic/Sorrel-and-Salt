export interface SupportViewReplyFormProps {
  /** The mailed link's token, sent with the reply as the proof of whose request it is. */
  token: string;
  /** Called once the reply is saved, so the page can read the request again. */
  onSent: () => void;
}
