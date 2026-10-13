import * as categoryService from '../services/categoryService.js';
import { toSafeCategory } from '../mappers/categoryMapper.js';

// Public listing of resource categories
export const list = async (req, res, next) => {
  try {
    const categories = await categoryService.listCategories();
    res.status(200).json({
      data: categories.map(toSafeCategory)
    });
  } catch (error) {
    next(error);
  }
};
