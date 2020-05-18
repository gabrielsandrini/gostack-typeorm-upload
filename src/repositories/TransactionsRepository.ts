import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactions = await this.find();

    const transactionAmounts = transactions.reduce(
      (accumulator, transaction) => {
        const { type, value } = transaction;
        accumulator[type] += Number(value);
        return accumulator;
      },
      {
        income: 0,
        outcome: 0,
      },
    );

    const { income, outcome } = transactionAmounts;
    return {
      income,
      outcome,
      total: income - outcome,
    };
  }
}

export default TransactionsRepository;
