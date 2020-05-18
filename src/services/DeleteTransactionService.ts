import { getRepository } from 'typeorm';

import Transaction from '../models/Transaction';

import AppError from '../errors/AppError';

interface Request {
  transaction_id: string;
}

class DeleteTransactionService {
  public async execute({ transaction_id }: Request): Promise<void> {
    const transactionRepository = getRepository(Transaction);

    const { affected } = await transactionRepository.delete(transaction_id);

    if (affected === 0) {
      throw new AppError('The transaction can not be deleted');
    }
  }
}

export default DeleteTransactionService;
