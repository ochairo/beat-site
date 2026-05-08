import { MockHttpClient } from "../shared/lib/http/http-client";

import { registerHomeEndpoints } from "../features/home/data/http-setup";
import { registerDocsEndpoints } from "../features/docs/data/http-setup";
import { registerBeatUIEndpoints } from "../features/beat-ui/data/http-setup";
import { registerStackBlitzEndpoints } from "../features/stackblitz/data/http-setup";
import { registerSamplesEndpoints } from "../features/samples/data/http-setup";

const client = new MockHttpClient(200);

registerHomeEndpoints(client);
registerDocsEndpoints(client);
registerBeatUIEndpoints(client);
registerStackBlitzEndpoints(client);
registerSamplesEndpoints(client);

export const httpClient = client;
