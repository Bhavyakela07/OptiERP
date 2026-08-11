import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.loginUser(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authService.getUserById(req.user!.id);
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const newUser = await authService.createUserByAdmin(req.body);
    res.status(201).json(newUser);
  } catch (error) {
    next(error);
  }
}

export async function getUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const users = await authService.listAllUsers();
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
}
