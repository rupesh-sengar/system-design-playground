import { Router, type NextFunction, type Request, type Response } from "express";
import { createIssueReportSchema } from "./contracts.js";
import type { IssueReportRepository } from "./issue-report.repository.js";

interface CreateIssueReportRouterOptions {
  issueReportRepository: IssueReportRepository;
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

const readHeader = (
  request: Request,
  headerName: string,
  maxLength: number,
): string | null => {
  const headerValue = request.get(headerName)?.trim();

  if (!headerValue) {
    return null;
  }

  return headerValue.slice(0, maxLength);
};

export const createIssueReportRouter = ({
  issueReportRepository,
}: CreateIssueReportRouterOptions): Router => {
  const router = Router();

  router.post(
    "/",
    createAsyncHandler(async (request, response) => {
      const input = createIssueReportSchema.parse(request.body);
      const browserContext = {
        ...(input.browserContext ?? {}),
        acceptLanguage: readHeader(request, "accept-language", 200),
        userAgent: readHeader(request, "user-agent", 600),
      };
      const issueReport = await issueReportRepository.create({
        ...input,
        browserContext,
      });

      response.status(201).json({
        data: {
          createdAt: issueReport.createdAt,
          id: issueReport.id,
          status: issueReport.status,
        },
      });
    }),
  );

  return router;
};
