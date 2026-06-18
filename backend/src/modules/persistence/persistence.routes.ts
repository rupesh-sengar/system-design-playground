import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import {
  appUserProfileSchema,
  problemIdParamsSchema,
  updateProblemProgressSchema,
  upsertPracticeSessionSchema,
} from "./contracts.js";
import { requireCurrentAppUser } from "./current-app-user.middleware.js";
import type { BillingAccessService } from "../billing/entitlements.js";
import type {
  AppUserRepository,
  PracticeSessionRepository,
  ProblemProgressRepository,
} from "./persistence.repository.js";

interface CreatePersistenceRouterOptions {
  appUserRepository: AppUserRepository;
  billingAccessService: BillingAccessService;
  practiceSessionRepository: PracticeSessionRepository;
  problemProgressRepository: ProblemProgressRepository;
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

export const createPersistenceRouter = ({
  appUserRepository,
  billingAccessService,
  practiceSessionRepository,
  problemProgressRepository,
}: CreatePersistenceRouterOptions): Router => {
  const router = Router();

  router.put(
    "/me/profile",
    createAsyncHandler(async (request, response) => {
      const appUser = requireCurrentAppUser(request);
      const input = appUserProfileSchema.parse(request.body);
      const updatedAppUser = await appUserRepository.updateProfile(
        appUser.id,
        input,
      );

      response.json({
        data: updatedAppUser,
      });
    }),
  );

  router.get(
    "/problem-progress",
    createAsyncHandler(async (request, response) => {
      const appUser = requireCurrentAppUser(request);
      await billingAccessService.assertCanUseCloudSync(appUser.id);

      const progressEntries = await problemProgressRepository.listByUserId(
        appUser.id,
      );

      response.json({
        data: progressEntries,
      });
    }),
  );

  router.put(
    "/problem-progress/:problemId",
    createAsyncHandler(async (request, response) => {
      const appUser = requireCurrentAppUser(request);
      await billingAccessService.assertCanUseCloudSync(appUser.id);

      const { problemId } = problemIdParamsSchema.parse(request.params);
      const input = updateProblemProgressSchema.parse(request.body);
      const progressRecord = await problemProgressRepository.upsert(
        appUser.id,
        problemId,
        input,
      );

      response.json({
        data: progressRecord,
      });
    }),
  );

  router.delete(
    "/problem-progress",
    createAsyncHandler(async (request, response) => {
      const appUser = requireCurrentAppUser(request);
      await billingAccessService.assertCanUseCloudSync(appUser.id);

      await problemProgressRepository.resetForUser(appUser.id);

      response.json({
        data: {
          reset: true,
        },
      });
    }),
  );

  router.get(
    "/practice-sessions/:problemId",
    createAsyncHandler(async (request, response) => {
      const appUser = requireCurrentAppUser(request);
      await billingAccessService.assertCanUseCloudSync(appUser.id);

      const { problemId } = problemIdParamsSchema.parse(request.params);
      const session = await practiceSessionRepository.findByUserIdAndProblemId(
        appUser.id,
        problemId,
      );

      response.json({
        data: session,
      });
    }),
  );

  router.put(
    "/practice-sessions/:problemId",
    createAsyncHandler(async (request, response) => {
      const appUser = requireCurrentAppUser(request);
      await billingAccessService.assertCanUseCloudSync(appUser.id);

      const { problemId } = problemIdParamsSchema.parse(request.params);
      const input = upsertPracticeSessionSchema.parse(request.body);
      const session = await practiceSessionRepository.upsert(
        appUser.id,
        problemId,
        input,
      );

      response.json({
        data: session,
      });
    }),
  );

  router.delete(
    "/practice-sessions/:problemId",
    createAsyncHandler(async (request, response) => {
      const appUser = requireCurrentAppUser(request);
      await billingAccessService.assertCanUseCloudSync(appUser.id);

      const { problemId } = problemIdParamsSchema.parse(request.params);
      await practiceSessionRepository.reset(appUser.id, problemId);

      response.json({
        data: {
          deleted: true,
        },
      });
    }),
  );

  return router;
};
