import { Request, Response, NextFunction } from 'express';
import * as challanService from './challans.service';

export async function getChallans(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await challanService.listChallans(req.query as any);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function createChallan(req: Request, res: Response, next: NextFunction) {
  try {
    const challan = await challanService.createChallan(req.body, req.user!.id);
    res.status(201).json(challan);
  } catch (error) {
    next(error);
  }
}

export async function getChallanById(req: Request, res: Response, next: NextFunction) {
  try {
    const challan = await challanService.getChallanById(req.params.id);
    res.status(200).json(challan);
  } catch (error) {
    next(error);
  }
}

export async function updateChallan(req: Request, res: Response, next: NextFunction) {
  try {
    const challan = await challanService.updateChallan(req.params.id, req.body);
    res.status(200).json(challan);
  } catch (error) {
    next(error);
  }
}

export async function confirmChallan(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await challanService.confirmChallan(req.params.id, req.user!.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function cancelChallan(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await challanService.cancelChallan(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
