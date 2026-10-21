import { protect } from "../middleware/auth.js";
import { PipelineProject, PipelineJob } from "./models.js";
import { MongoRepository } from "./repository.js";
import { AssetStore } from "./media.js";
import { createModelClient } from "./providers.js";
import { PipelineService } from "./service.js";
import { createPipelineRouter } from "./routes.js";
import { defaultBillingAdapter } from "./billing.js";

export async function createWeddingPipelineRouter() {
  await Promise.all([PipelineProject.init(), PipelineJob.init()]);
  return createPipelineRouter({
    authenticate: protect,
    service: new PipelineService({
      repository: new MongoRepository(),
      assets: new AssetStore(),
      gemini: createModelClient(),
      billing: defaultBillingAdapter,
    }),
  });
}
