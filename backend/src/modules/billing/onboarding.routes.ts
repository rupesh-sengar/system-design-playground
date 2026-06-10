import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { requireCurrentAppUser } from "../persistence/current-app-user.middleware.js";
import type { OnboardingProfileRepository } from "./billing.repository.js";
import { onboardingProfileSchema } from "./contracts.js";

interface CreateOnboardingRouterOptions {
  onboardingProfileRepository: OnboardingProfileRepository;
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

export const createOnboardingRouter = ({
  onboardingProfileRepository,
}: CreateOnboardingRouterOptions): Router => {
  const router = Router();

  router.get(
    "/me",
    createAsyncHandler(async (request, response) => {
      const appUser = requireCurrentAppUser(request);
      const profile = await onboardingProfileRepository.findByUserId(appUser.id);

      response.json({
        data: profile,
      });
    }),
  );

  router.put(
    "/me",
    createAsyncHandler(async (request, response) => {
      const appUser = requireCurrentAppUser(request);
      const input = onboardingProfileSchema.parse(request.body);
      const profile = await onboardingProfileRepository.upsert(
        appUser.id,
        input,
      );

      response.json({
        data: profile,
      });
    }),
  );

  return router;
};
