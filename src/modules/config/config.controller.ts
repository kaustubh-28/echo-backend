import { Request, Response, NextFunction } from 'express';
import { getFullConfig } from './config.service';

export async function getConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const config = await getFullConfig();
    res.status(200).json({
      success: true,
      data: config,
      meta: {},
      error: null
    });
  } catch (error) {
    next(error);
  }
}
