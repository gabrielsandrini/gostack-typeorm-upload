import { getRepository, getCustomRepository } from 'typeorm';

import TransactionRepository from '../repositories/TransactionsRepository';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

import AppError from '../errors/AppError';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category_title: string;
}

class CreateTransactionService {
  public async execute({
    title = 'Untitled',
    value,
    type,
    category_title = 'Others',
  }: Request): Promise<Transaction> {
    const transactionRepository = getCustomRepository(TransactionRepository);
    const categoryRepository = getRepository(Category);

    // Validate data
    const isRequestValid =
      value && type && (type === 'income' || type === 'outcome');
    if (!isRequestValid) {
      throw new AppError('Invalid data');
    }

    // Check if balance is valid
    if (type === 'outcome') {
      const balance = await transactionRepository.getBalance();

      if (balance.total - value < 0) {
        throw new AppError(
          "You don't have enought money to do this transaction",
        );
      }
    }

    // Check if category exists
    let category = await categoryRepository.findOne({
      where: { title: category_title },
    });

    // IF category doesn't exists, create it
    if (!category) {
      category = categoryRepository.create({ title: category_title });
      await categoryRepository.save(category);
    }

    const transaction = transactionRepository.create({
      title,
      value,
      type,
      category_id: category.id,
    });

    await transactionRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
