import { Request, Response, NextFunction } from 'express';
import * as customerService from './customers.service';

export async function getCustomers(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await customerService.listCustomers(req.query as any);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function createCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const customer = await customerService.createCustomer(req.body, req.user!.id);
    res.status(201).json(customer);
  } catch (error) {
    next(error);
  }
}

export async function getCustomerById(req: Request, res: Response, next: NextFunction) {
  try {
    const customer = await customerService.getCustomerById(req.params.id);
    res.status(200).json(customer);
  } catch (error) {
    next(error);
  }
}

export async function updateCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const customer = await customerService.updateCustomer(req.params.id, req.body);
    res.status(200).json(customer);
  } catch (error) {
    next(error);
  }
}

export async function deleteCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await customerService.deleteCustomer(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function suspendCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await customerService.suspendCustomer(req.params.id, req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function unsuspendCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await customerService.unsuspendCustomer(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function addFollowup(req: Request, res: Response, next: NextFunction) {
  try {
    const followup = await customerService.addFollowup(req.params.id, req.body, req.user!.id);
    res.status(201).json(followup);
  } catch (error) {
    next(error);
  }
}
