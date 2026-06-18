import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { requireCurrentAppUser } from "../persistence/current-app-user.middleware.js";
import type { BillingAccessService } from "../billing/entitlements.js";
import {
  stageEditorialParamsSchema,
  upsertStageEditorialSchema,
} from "./contracts.js";
import {
  hasStageEditorialReadPermission,
  requireStageEditorialWritePermission,
} from "./editorial-permissions.js";
import type { StageEditorialRepository } from "./editorials.repository.js";

interface CreateEditorialsRouterOptions {
  billingAccessService: BillingAccessService;
  stageEditorialRepository: StageEditorialRepository;
}

const createAsyncHandler =
  (
    handler: (
      request: Request,
      response: Response,
      next: NextFunction,
    ) => Promise<void>,
  ) =>
  async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      await handler(request, response, next);
    } catch (error) {
      next(error);
    }
  };

export const createEditorialsRouter = ({
  billingAccessService,
  stageEditorialRepository,
}: CreateEditorialsRouterOptions): Router => {
  const router = Router();

  router.get(
    "/:problemId/:stageId",
    createAsyncHandler(async (request, response) => {
      if (!hasStageEditorialReadPermission(request)) {
        const appUser = requireCurrentAppUser(request);
        await billingAccessService.assertCanReadEditorials(appUser.id);
      }

      const { problemId, stageId } = stageEditorialParamsSchema.parse(
        request.params,
      );
      const editorial =
        await stageEditorialRepository.findByProblemIdAndStageId(
          problemId,
          stageId,
        );

      response.json({
        data: editorial,
      });
    }),
  );

  router.put(
    "/:problemId/:stageId",
    createAsyncHandler(async (request, response) => {
      requireStageEditorialWritePermission(request);

      const appUser = requireCurrentAppUser(request);
      const { problemId, stageId } = stageEditorialParamsSchema.parse(
        request.params,
      );
      const input = upsertStageEditorialSchema.parse(request.body);
      const editorial = await stageEditorialRepository.upsert(
        problemId,
        stageId,
        input,
        appUser.id,
      );

      response.json({
        data: editorial,
      });
    }),
  );

  return router;
};
