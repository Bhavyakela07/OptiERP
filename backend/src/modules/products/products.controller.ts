import { Request, Response, NextFunction } from 'express';
import * as productService from './products.service';

export async function getProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await productService.listProducts(req.query as any);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function createProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await productService.createProduct(req.body);
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
}

export async function getProductById(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await productService.getProductById(req.params.id);
    res.status(200).json(product);
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);
    res.status(200).json(product);
  } catch (error) {
    next(error);
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await productService.deleteProduct(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getStockMovements(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await productService.getStockMovements(req.params.id, page, limit);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function createStockMovement(req: Request, res: Response, next: NextFunction) {
  try {
    const movement = await productService.createStockMovement(req.params.id, req.body, req.user!.id);
    res.status(201).json(movement);
  } catch (error) {
    next(error);
  }
}
