import { Request, Response } from 'express';

import {
  executeAutomationRun,
  getAutomationRuns,
  getLatestAutomationRun
} from '../services/automationRunService';

export async function runAutomation(
  req: Request,
  res: Response
) {
  try {
    const result = await executeAutomationRun('MANUAL');

    return res.status(200).json({
      success: true,
      message: 'Administrative automation cycle completed.',
      data: result.result,
      run: result.run
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Automation cycle failed.';

    return res.status(500).json({
      success: false,
      message
    });
  }
}

export async function listAutomationRuns(
  req: Request,
  res: Response
) {
  try {
    const rawLimit = Number(req.query.limit ?? 20);

    const limit = Number.isFinite(rawLimit)
      ? Math.min(
          Math.max(Math.floor(rawLimit), 1),
          100
        )
      : 20;

    const runs = await getAutomationRuns(limit);

    return res.status(200).json({
      success: true,
      data: runs
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unable to load automation history.';

    return res.status(500).json({
      success: false,
      message
    });
  }
}

export async function latestAutomationRun(
  req: Request,
  res: Response
) {
  try {
    const run = await getLatestAutomationRun();

    return res.status(200).json({
      success: true,
      data: run
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unable to load latest automation run.';

    return res.status(500).json({
      success: false,
      message
    });
  }
}